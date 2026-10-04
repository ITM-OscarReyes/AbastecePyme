# AbastecePyme

## Backend (F1 — Catálogo de dependencias)

Requisitos: Python 3.12+.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload
```

La API queda disponible bajo `/api/v1` y arranca con el conjunto sintético de
demostración de F1. Para documentación interactiva: `/docs`.
