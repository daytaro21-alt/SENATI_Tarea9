"""
FastAPI Backend — Clasificador de Trámites Municipales
"""
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .classifier import extract_text, classify_document, TRAMITE_CATALOG
from .database import init_db, insert_document, get_all_documents, update_document, delete_document

# Directorios relativos para que funcione independiente del directorio actual
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app = FastAPI(
    title="Clasificador de Trámites Municipales",
    description="Sistema inteligente de clasificación y enrutamiento de trámites usando NLP/ML",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Inicializa la base de datos al arrancar
    init_db()

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


class DocumentUpdate(BaseModel):
    priority: str
    priority_level: int
    office: str
    office_icon: str
    color: str
    score: int


@app.get("/")
async def root():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Clasificador Municipal de Trámites", "version": "1.0.0"}


@app.get("/api/catalog")
async def get_catalog():
    """Retorna el catálogo completo de trámites."""
    return {
        name: {
            "priority": p["priority"],
            "priority_level": p["priority_level"],
            "office": p["office"],
            "office_icon": p["office_icon"],
            "color": p["color"],
        }
        for name, p in TRAMITE_CATALOG.items()
    }


@app.get("/api/history")
async def get_history():
    """Retorna todos los documentos registrados en la base de datos."""
    return get_all_documents()


@app.post("/api/classify")
async def classify(file: UploadFile = File(...)):
    filename = file.filename or ""
    lower = filename.lower()

    if not (lower.endswith(".pdf") or lower.endswith(".docx")):
        raise HTTPException(
            status_code=400,
            detail="Solo se aceptan archivos PDF (.pdf) o Word (.docx).",
        )

    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 20 MB.")

    text, error = extract_text(content, filename)
    if error:
        raise HTTPException(status_code=422, detail=error)

    result = classify_document(text)
    result["filename"] = filename
    result["file_size"] = len(content)
    result["success"] = True
    result["full_text"] = text

    # Guarda el documento en la base de datos local
    doc_id = insert_document(result)
    result["id"] = doc_id

    return result


@app.put("/api/documents/{id}")
async def update_doc(id: int, payload: DocumentUpdate):
    """Permite al operador corregir manualmente la clasificación de un trámite."""
    updated = update_document(
        id,
        payload.priority,
        payload.priority_level,
        payload.office,
        payload.office_icon,
        payload.color,
        payload.score
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    return updated


@app.delete("/api/documents/{id}")
async def delete_doc(id: int):
    """Permite eliminar un documento registrado en el sistema."""
    success = delete_document(id)
    if not success:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    return {"status": "ok", "message": "Documento eliminado correctamente."}


