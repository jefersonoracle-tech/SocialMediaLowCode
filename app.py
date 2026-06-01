import os
import json
from pathlib import Path
from flask import Flask, request, jsonify, render_template, Response, stream_with_context
import anthropic
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

SKILL_PATH = Path(__file__).parent / "skill" / "SKILL.md"
_OVERRIDE = """MODO DE OPERAÇÃO — INTERFACE WEB (PRIORIDADE MÁXIMA):
Você está sendo chamado por uma interface web que já coletou todos os dados do briefing.
REGRAS ABSOLUTAS que sobrepõem qualquer instrução das fases abaixo:
1. NUNCA faça perguntas ao usuário — nenhuma, de nenhum tipo.
2. NUNCA peça arquivo de referência (PASSO 0 está desativado).
3. NUNCA peça confirmação de tema, paleta, formato ou qualquer outro dado.
4. Execute SEMPRE as FASES 2, 3, 4 e 5 diretamente com os dados recebidos.
5. Se algum dado estiver faltando, assuma um valor razoável e prossiga sem comentar.
---
"""
SKILL_PROMPT = _OVERRIDE + SKILL_PATH.read_text(encoding="utf-8")


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
