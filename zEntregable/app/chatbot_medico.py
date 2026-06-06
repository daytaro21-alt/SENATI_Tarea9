import os
# pyrefly: ignore [missing-import]
import google.generativeai as genai

# Configura el chatbot utilizando la clave de la API y define las instrucciones del sistema.
def configurar_chatbot():
    clave_api = os.environ.get("GEMINI_API_KEY")
    genai.configure(api_key=clave_api)
    
    instrucciones = (
        "Eres un asistente virtual de triaje para una botica. Tu objetivo es ayudar "
        "a los usuarios con sus consultas de salud de manera segura. Debes seguir "
        "las siguientes reglas:\n\n"
        "1. Filtro de gravedad: Si el usuario describe sintomas criticos o de bandera roja "
        "(como dolor opresivo en el pecho, asfixia, dificultad respiratoria grave, "
        "hemorragias abundantes o perdida de conocimiento), debes bloquear cualquier "
        "recomendacion de productos y ordenar de manera clara y firme al usuario que acuda "
        "a urgencias de inmediato.\n"
        "2. Venta libre: Si los sintomas son leves (como dolor de cabeza tensional, acidez, "
        "congestion nasal leve o molestias estomacales leves), debes sugerir principios "
        "activos de venta libre (como paracetamol, ibuprofeno o antiacidos).\n"
        "3. Aviso legal: Debes aclarar de forma explicita en tu respuesta que eres un asistente "
        "de botica y no un medico profesional, por lo que no emites diagnosticos medicos.\n"
        "4. Tono: El tono de tu respuesta debe ser empatico, calmado y profesional."
    )
    
    modelo = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=instrucciones
    )
    return modelo

# Procesa la consulta del paciente usando el modelo configurado y devuelve la respuesta.
def procesar_consulta_paciente(modelo, mensaje_usuario):
    try:
        respuesta = modelo.generate_content(mensaje_usuario)
        return respuesta.text
    except Exception as error:
        return (
            "Lo sentimos, ha ocurrido un error al procesar tu consulta. "
            "Por favor, intenta nuevamente mas tarde."
        )
