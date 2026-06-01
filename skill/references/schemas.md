# Schemas de Referência

## Configuração do Carrossel (`config.json`)

Este JSON alimenta o script `carousel_generator.py`. A skill deve gerar este arquivo com a paleta customizada derivada da Fase 4 (Direção Criativa).

### Exemplo: Nicho Finanças Pessoais

```json
{
  "handle": "@meusrendimentos",
  "palette": {
    "bg": "#0A0E17",
    "bg_accent": "#111827",
    "text_primary": "#F9FAFB",
    "text_secondary": "#9CA3AF",
    "accent": "#10B981",
    "accent_soft": "#065F46",
    "card_bg": "#1F2937"
  },
  "fonts": {
    "display": "./fonts/Outfit-Bold.ttf",
    "heading": "./fonts/Outfit-Bold.ttf",
    "body": "./fonts/WorkSans-Regular.ttf",
    "body_bold": "./fonts/WorkSans-Bold.ttf"
  },
  "slides": [
    {
      "type": "hook",
      "title": "Você perde R$800/mês sem perceber",
      "subtitle": "E a solução leva 15 minutos",
      "badge": "Finanças"
    },
    {
      "type": "pain",
      "title": "Reconhece algum desses?",
      "items": [
        "Chega no fim do mês sem saber pra onde foi o dinheiro",
        "Já tentou planilha mas abandona na segunda semana",
        "Parcela tudo no cartão achando que está no controle",
        "Tem medo de olhar o extrato bancário"
      ]
    },
    {
      "type": "context",
      "title": "Por que isso acontece",
      "body": "O problema não é falta de disciplina. É falta de sistema. 72% dos brasileiros não separam contas fixas de gastos variáveis. Sem essa separação, qualquer orçamento vai falhar — não importa quantas planilhas você baixe."
    },
    {
      "type": "cta",
      "title": "O método dos 3 baldes",
      "items": [
        "Balde 1: Fixos (aluguel, luz, internet) — débito automático",
        "Balde 2: Variáveis (mercado, lazer) — valor semanal fixo",
        "Balde 3: Futuro (investimento) — transferência automática no dia 1"
      ],
      "cta": "COMENTE '3BALDES' PARA RECEBER A PLANILHA"
    }
  ]
}
```

### Exemplo: Nicho Fitness/Treino

```json
{
  "handle": "@treinopesado",
  "palette": {
    "bg": "#0F0F0F",
    "bg_accent": "#1A1A1A",
    "text_primary": "#FFFFFF",
    "text_secondary": "#ACACAC",
    "accent": "#FF4D00",
    "accent_soft": "#992E00",
    "card_bg": "#252525"
  },
  "fonts": {
    "display": "./fonts/BigShoulders-Bold.ttf",
    "heading": "./fonts/BigShoulders-Bold.ttf",
    "body": "./fonts/WorkSans-Regular.ttf",
    "body_bold": "./fonts/WorkSans-Bold.ttf"
  }
}
```

### Exemplo: Nicho Maternidade

```json
{
  "palette": {
    "bg": "#FFF8F3",
    "bg_accent": "#FFEEE3",
    "text_primary": "#2D2020",
    "text_secondary": "#7A6565",
    "accent": "#E88D67",
    "accent_soft": "#F5C7B0",
    "card_bg": "#FFF0E8"
  },
  "fonts": {
    "display": "./fonts/YoungSerif-Regular.ttf",
    "body": "./fonts/CrimsonPro-Regular.ttf",
    "body_bold": "./fonts/CrimsonPro-Bold.ttf"
  }
}
```

### Exemplo: Nicho Tecnologia/Dev

```json
{
  "palette": {
    "bg": "#0D1117",
    "bg_accent": "#161B22",
    "text_primary": "#C9D1D9",
    "text_secondary": "#8B949E",
    "accent": "#58A6FF",
    "accent_soft": "#1F6FEB",
    "card_bg": "#21262D"
  },
  "fonts": {
    "display": "./fonts/GeistMono-Bold.ttf",
    "body": "./fonts/IBMPlexSerif-Regular.ttf",
    "body_bold": "./fonts/IBMPlexSerif-Bold.ttf"
  }
}
```

## Campos obrigatórios

| Campo | Tipo | Descrição |
|---|---|---|
| `slides` | array | Lista de slides (mínimo 2, recomendado 4) |
| `slides[].type` | string | `hook`, `pain`, `context`, `cta` |
| `slides[].title` | string | Título principal do slide |
| `palette` | object | Objeto com as 7 cores (sempre custom, derivado do nicho) |
| `fonts` | object | Caminhos para os arquivos `.ttf` escolhidos para o nicho |

## Campos opcionais

| Campo | Tipo | Onde | Descrição |
|---|---|---|---|
| `handle` | string | raiz | @ do perfil (aparece no rodapé) |
| `badge` | string | slide hook | Etiqueta/tag no topo |
| `subtitle` | string | slide hook | Texto de apoio sob o título |
| `items` | array | slides pain/cta | Lista de pontos/bullets |
| `body` | string | slides context/cta | Texto corrido |
| `cta` | string | slide cta | Texto do botão de CTA |

## Paletas predefinidas (fallback)

O script mantém 6 paletas predefinidas como fallback, mas a abordagem correta é sempre gerar uma paleta custom na Fase 4. As predefinidas só devem ser usadas se, por alguma razão, coincidirem perfeitamente com o nicho — e nesse caso, documente por quê.

Predefinidas: `profissional`, `moderno`, `educativo`, `minimalista`, `ousado`, `natureza`
