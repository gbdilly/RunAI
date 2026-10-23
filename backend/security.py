# backend/security.py
import bcrypt


def gerar_hash(senha: str) -> str:
    """Transforma a senha em um hash irreversível para guardar no banco."""
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def conferir_senha(senha: str, hash_salvo: str) -> bool:
    """Compara a senha digitada com o hash guardado."""
    return bcrypt.checkpw(senha.encode("utf-8"), hash_salvo.encode("utf-8"))