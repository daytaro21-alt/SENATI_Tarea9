import sqlite3

# Funcion para inicializar las tablas de la base de datos de la botica
def inicializar_base_datos():
    conexion = sqlite3.connect('zEntregable/app/app.db')
    cursor = conexion.cursor()

    # Crear tabla para el inventario de medicamentos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inventario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_medicamento TEXT NOT NULL,
            principio_activo TEXT NOT NULL,
            tipo_venta TEXT NOT NULL,
            stock INTEGER NOT NULL
        )
    ''')

    # Crear tabla para asociar sintomas comunes con componentes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS diccionario_clinico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sintoma_reportado TEXT NOT NULL,
            componente_sugerido TEXT NOT NULL,
            nivel_gravedad TEXT NOT NULL
        )
    ''')

    # Crear tabla para guardar la memoria de las consultas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS historial_triage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mensaje_paciente TEXT NOT NULL,
            accion_bot TEXT NOT NULL,
            fecha_registro TEXT NOT NULL
        )
    ''')

    conexion.commit()
    conexion.close()

# Funcion para registrar una nueva consulta en el historial
def guardar_triage(mensaje, accion, fecha):
    conexion = sqlite3.connect('zEntregable/app/app.db')
    cursor = conexion.cursor()
    
    cursor.execute('''
        INSERT INTO historial_triage (mensaje_paciente, accion_bot, fecha_registro)
        VALUES (?, ?, ?)
    ''', (mensaje, accion, fecha))
    
    conexion.commit()
    conexion.close()
