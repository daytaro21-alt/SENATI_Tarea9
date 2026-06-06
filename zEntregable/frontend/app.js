// Captura de los elementos principales del DOM
const entrada_usuario = document.getElementById("entrada_usuario");
const boton_enviar = document.getElementById("boton_enviar");
const contenedor_chat = document.getElementById("contenedor_chat");

// Agrega un mensaje al historial del chat en la pantalla
function agregar_mensaje_interfaz(texto, remitente) {
    const div_mensaje = document.createElement("div");
    div_mensaje.classList.add("mensaje", remitente);

    const div_contenido = document.createElement("div");
    div_contenido.classList.add("contenido_mensaje");
    div_contenido.textContent = texto;

    div_mensaje.appendChild(div_contenido);
    contenedor_chat.appendChild(div_mensaje);

    // Hacer scroll automatico hacia abajo del contenedor
    contenedor_chat.scrollTop = contenedor_chat.scrollHeight;
}

// Captura el mensaje del usuario, lo envia al servidor y muestra la respuesta de la IA
async function enviar_mensaje() {
    const texto = entrada_usuario.value.trim();
    if (!texto) {
        return;
    }

    // Mostrar el mensaje del usuario en la interfaz
    agregar_mensaje_interfaz(texto, "usuario");

    // Limpiar el campo de entrada
    entrada_usuario.value = "";

    try {
        // Enviar la peticion post al servidor flask
        const respuesta = await fetch("/api/mensaje", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ mensaje_usuario: texto })
        });

        if (!respuesta.ok) {
            throw new Error("Error en la respuesta del servidor");
        }

        const datos = await respuesta.json();
        
        // Mostrar la respuesta del bot en la interfaz
        agregar_mensaje_interfaz(datos.respuesta, "bot");
    } catch (error) {
        // Mostrar mensaje de error si la conexion falla
        agregar_mensaje_interfaz("Lo sentimos, ha ocurrido un error de conexion. Por favor, intenta de nuevo.", "bot");
    }
}

// Asignar evento click al boton de enviar
boton_enviar.addEventListener("click", enviar_mensaje);

// Asignar evento tecla Enter al campo de entrada de texto
entrada_usuario.addEventListener("keypress", function (evento) {
    if (evento.key === "Enter") {
        enviar_mensaje();
    }
});
