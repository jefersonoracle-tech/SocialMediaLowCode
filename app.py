import os
import json
import re
from pathlib import Path
from flask import Flask, request, jsonify, render_template, Response, stream_with_context
import anthropic
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

SKILL_PATH = Path(__file__).parent / "skill" / "SKILL.md"


def _build_system_prompt() -> str:
    full = SKILL_PATH.read_text(encoding="utf-8")
    marker = "## FASE 2"
    idx = full.find(marker)
    after_fase1 = full[idx:] if idx != -1 else full

    header = """Você é um Gestor de Mídias Sociais sênior e Estrategista de Marketing Digital.
Seu trabalho é conduzir o ciclo completo de criação de conteúdo para Instagram. Tudo em PT-BR.

MODO DE OPERAÇÃO — INTERFACE WEB:
- O briefing já foi coletado por um formulário. Todos os dados estão na mensagem do usuário.
- NÃO faça nenhuma pergunta. NÃO peça arquivo de referência. NÃO peça confirmações.
- Se algum dado estiver faltando, assuma um valor razoável e prossiga sem mencionar.
- Execute diretamente as FASES 3 → 4 → 5 e entregue o resultado final completo.
- O tema já foi escolhido pelo usuário — pule a FASE 2 (pesquisa) e vá direto para FASE 3.

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


@app.route("/api/buscar-temas", methods=["POST"])
def buscar_temas():
    data = request.json or {}
    nicho = data.get("nicho", "").strip()
    objetivo = data.get("objetivo", "").strip()
    publico = data.get("publico", "").strip()

    if not nicho:
        return jsonify({"error": "Nicho é obrigatório."}), 400

    prompt = f"""Pesquise na internet os temas mais relevantes e em alta agora para conteúdo educativo no Instagram no nicho de "{nicho}".

Contexto:
- Público-alvo: {publico or 'geral'}
- Objetivo do post: {objetivo or 'gerar engajamento'}

Busque tendências recentes, assuntos em alta, dúvidas frequentes e temas com potencial viral para este nicho.

Retorne SOMENTE um JSON válido, sem markdown, sem explicações fora do JSON:
{{
  "temas": [
    {{
      "titulo": "título curto e direto (máx 8 palavras)",
      "descricao": "por que este tema está em alta e tem potencial de engajamento (1-2 frases)",
      "angulo": "ângulo específico e original para o post"
    }}
  ]
}}

Sugira entre 5 e 6 temas ordenados do maior para o menor potencial."""

    try:
        client = get_client()
        response = client.messages.create(
            model="claude-sonnet-4-5-20251001",
            max_tokens=2048,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}],
            messages=[{"role": "user", "content": prompt}],
        )

        text = ""
        for block in response.content:
            if hasattr(block, "text"):
                text += block.text

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return jsonify(json.loads(match.group()))

        return jsonify({"error": "Resposta inesperada da IA.", "raw": text}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
            ) as s:
                for text in s.text_stream:
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
