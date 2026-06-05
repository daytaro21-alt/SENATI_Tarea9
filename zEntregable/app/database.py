import os
import sqlite3
import json
from datetime import datetime

# Directorio base y ruta de la base de datos
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "app.db")

def get_connection():
    """Retorna una conexión a la base de datos SQLite."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Crea la tabla de documentos si no existe e introduce columnas necesarias."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            file_size INTEGER,
            tramite_type TEXT NOT NULL,
            priority TEXT NOT NULL,
            priority_level INTEGER NOT NULL,
            office TEXT NOT NULL,
            office_icon TEXT,
            score INTEGER NOT NULL,
            score_base INTEGER,
            score_type_bonus INTEGER,
            score_age_bonus INTEGER,
            age_description TEXT,
            document_year INTEGER,
            text_excerpt TEXT,
            color TEXT,
            timestamp TEXT NOT NULL,
            edited INTEGER DEFAULT 0
        )
    """)
    
    # Intento de agregar nuevas columnas en caso de base de datos preexistente
    try:
        cursor.execute("ALTER TABLE documents ADD COLUMN full_text TEXT")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute("ALTER TABLE documents ADD COLUMN alternatives TEXT")
    except sqlite3.OperationalError:
        pass
        
    conn.commit()
    conn.close()

def insert_document(doc):
    """Guarda un documento clasificado en la base de datos y retorna su ID."""
    conn = get_connection()
    cursor = conn.cursor()
    
    timestamp = datetime.now().isoformat()
    sb = doc.get("score_breakdown", {})
    alternatives_json = json.dumps(doc.get("alternatives", []))
    
    cursor.execute("""
        INSERT INTO documents (
            filename, file_size, tramite_type, priority, priority_level, 
            office, office_icon, score, score_base, score_type_bonus, 
            score_age_bonus, age_description, document_year, text_excerpt, 
            color, timestamp, edited, full_text, alternatives
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    """, (
        doc.get("filename", ""),
        doc.get("file_size", 0),
        doc.get("tramite_type", ""),
        doc.get("priority", ""),
        doc.get("priority_level", 1),
        doc.get("office", ""),
        doc.get("office_icon", ""),
        doc.get("score", 0),
        sb.get("base", 0),
        sb.get("type_bonus", 0),
        sb.get("age_bonus", 0),
        doc.get("age_description", ""),
        doc.get("document_year"),
        doc.get("text_excerpt", ""),
        doc.get("color", "rutinario"),
        timestamp,
        doc.get("full_text", ""),
        alternatives_json
    ))
    
    doc_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return doc_id

def get_all_documents():
    """Retorna todos los documentos procesados ordenados por fecha descendente."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM documents 
        ORDER BY timestamp DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for r in rows:
        d = dict(r)
        # Formatear el breakdown para compatibilidad con el frontend
        d["score_breakdown"] = {
            "base": d.pop("score_base"),
            "type_bonus": d.pop("score_type_bonus"),
            "age_bonus": d.pop("score_age_bonus"),
            "total": d["score"]
        }
        # Deserializar alternativas
        try:
            d["alternatives"] = json.loads(d.get("alternatives") or "[]")
        except Exception:
            d["alternatives"] = []
        result.append(d)
    return result

def update_document(doc_id, priority, priority_level, office, office_icon, color, score):
    """Actualiza la clasificación y el enrutamiento de un documento en la BD."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE documents
        SET priority = ?,
            priority_level = ?,
            office = ?,
            office_icon = ?,
            color = ?,
            score = ?,
            edited = 1
        WHERE id = ?
    """, (priority, priority_level, office, office_icon, color, score, doc_id))
    conn.commit()
    
    # Obtener el registro actualizado
    cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        d = dict(row)
        d["score_breakdown"] = {
            "base": d.pop("score_base"),
            "type_bonus": d.pop("score_type_bonus"),
            "age_bonus": d.pop("score_age_bonus"),
            "total": d["score"]
        }
        try:
            d["alternatives"] = json.loads(d.get("alternatives") or "[]")
        except Exception:
            d["alternatives"] = []
        return d
    return None


def delete_document(doc_id: int) -> bool:
    """Elimina un documento de la base de datos por su ID. Retorna True si se eliminó, False si no."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    rowcount = cursor.rowcount
    conn.commit()
    conn.close()
    return rowcount > 0

