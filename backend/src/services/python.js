import { execFile } from "child_process";
import { promisify } from "util";

const ejecutarArchivo = promisify(execFile);

export async function clasificarConPython(texto) {
    const rutaPython = "./src/python/venv/Scripts/python.exe";
    const rutaScript = "./src/python/predecir_mensaje.py";

    const { stdout } = await ejecutarArchivo(
        rutaPython,
        [rutaScript, texto]
    );

    const resultado = JSON.parse(stdout);

    return resultado.categoria;
}