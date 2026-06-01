import os
import json
from pathlib import Path
from flask import Flask, request, jsonify, render_template, Response, stream_with_context
import anthropic
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

SKILL_PATH = Path(__file__).parent / "skill" / "SKILL.md"

def _build_system_prompt() -> str:
    full = SKILL_PATH.read_text(encoding="utf-8")
    # Remove FASE 1 entirely — the web form already handles data collection.
    # Keep everything from FASE 2 onwards.
    marker = "## FASE 2"
    idx = full.find(marker)
    after_fase1 = full[idx:] if idx != -1 else full

    header = """Você é um Gestor de Mídias Sociais sênior e Estrategista de Marketing Digital.
Seu trabalho é conduzir o ciclo completo de criação de conteúdo para Instagram. Tudo em PT-BR.

MODO DE OPERAÇÃO — INTERFACE WEB:
- O briefing já foi coletado por um formulário. Todos os dados estão na mensagem do usuário.
- NÃO faça nenhuma pergunta. NÃO peça arquivo de referência. NÃO peça confirmações.
- Se algum dado estiver faltando, assuma um valor razoável e prossiga sem mencionar.
- Execute diretamente as FASES 2 → 3 → 4 → 5 e entregue o resultado final completo.

Fluxo de execução (silencioso — o usuário só vê o resultado final):
  FASE 2: Pesquisa de tendências (web_search)
  FASE 3: Seleção do melhor tema (automático, sem mostrar opções)
  FASE 4: Direção criativa (paleta, tipografia, estilo visual)
  FASE 5: Produção (prompts Gemini + legenda + sugestão musical)

---
"""
    return header + after_fase1

SKILL_PROMPT = _build_system_prompt()


def get_client():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY não configurada.")
    return anthropic.Anthropic(api_key=api_key)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.json or {}
    briefing = data.get("briefing", "").strip()
    image_data = data.get("image")

    if not briefing:
        return jsonify({"error": "Briefing vazio."}), 400

    content = []

    if image_data:
        try:
            if "," in image_data:
                header, b64 = image_data.split(",", 1)
                media_type = header.split(":")[1].split(";")[0]
            else:
                b64, media_type = image_data, "image/jpeg"

            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": media_type, "data": b64},
            })
        except Exception:
            pass

    content.append({"type": "text", "text": briefing})

    def stream():
        try:
            client = get_client()
            with client.messages.stream(
                model="claude-opus-4-8",
                max_tokens=8192,
                system=SKILL_PROMPT,
                messages=[{"role": "user", "content": content}],
            ) as stream:
                for text in stream.text_stream:
                    yield f"data: {json.dumps({'text': text})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(stream()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n🚀 App rodando em http://localhost:{port}\n")
    app.run(debug=False, port=port)
