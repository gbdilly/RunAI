# backend/config_carga.py
# Limiares usados nas regras de prevenção de lesões (História 5).
# Ajuste estes valores aqui, sem mexer na lógica.

LIMITE_CRESCIMENTO_SEMANAL = 0.10  # 10%
LIMITE_ACWR = 1.5
MAX_DIAS_SEM_DESCANSO = 6          # alerta se passar de 6 dias seguidos
JANELA_AGUDA_DIAS = 7
JANELA_CRONICA_DIAS = 28