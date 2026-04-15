# Emotion & Sentiment Analysis (API-based)

This project uses Hugging Face Inference API for multilingual sentiment + emotion classification.

## Why API-based?

- Works on Railway free tier (no large `torch` installs)
- Supports mixed-language input better than basic lexicons
- Keeps the model shared across users; personalization comes from each user's text + stored history

## Required environment variables

- `HF_API_TOKEN`: Hugging Face access token (create at `https://huggingface.co/settings/tokens`)

Optional overrides:

- `HF_SENTIMENT_MODEL`: defaults to `cardiffnlp/twitter-xlm-roberta-base-sentiment`
- `HF_EMOTION_MODEL`: defaults to `MilaNLProc/xlm-emo-t`

## Notes

- If `HF_API_TOKEN` is missing or the API fails, the app falls back to a lightweight heuristic analyzer (still returns labels/scores).
- Do **not** put tokens in frontend code or commit them to GitHub.

