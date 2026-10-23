from sqlalchemy.orm import relationship
from database import Base
from sqlalchemy import Column, Integer, BigInteger, String, Text, Float, Date, DateTime, ForeignKey, func

class T_USERS(Base):
    __tablename__ = "T_USERS"

    id = Column(Integer, primary_key=True, index=True)

    # Dados básicos
    name = Column(String(100), nullable=True)
    email = Column(String(150), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=True)

    # Strava
    strava_athlete_id = Column(BigInteger, unique=True, nullable=True)
    strava_access_token = Column(String(255), nullable=True)
    strava_refresh_token = Column(String(255), nullable=True)
    strava_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Localização (preenchida na 1D)
    city = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    preferences = relationship("T_PREFERENCES", back_populates="user", uselist=False)
    workouts = relationship("T_WORKOUTS", back_populates="user")


class T_PREFERENCES(Base):
    __tablename__ = "T_PREFERENCES"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("T_USERS.id"), nullable=False, unique=True)
    goal_type = Column(String(50), nullable=True)      # 5km, 10km, meia, maratona, melhorar_tempo
    goal_date = Column(Date, nullable=True)            # data-alvo (opcional)
    days_per_week = Column(Integer, nullable=False, default=3)
    preferred_days = Column(String(50), nullable=True) # ex.: "seg,qua,sab"

    user = relationship("T_USERS", back_populates="preferences")


class T_WORKOUTS(Base):
    __tablename__ = "T_WORKOUTS"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("T_USERS.id"), nullable=False)
    strava_activity_id = Column(BigInteger, unique=True, nullable=True)
    workout_date = Column(Date, nullable=False)
    distance_km = Column(Float, nullable=False)
    duration_min = Column(Integer, nullable=True)
    elevation_m = Column(Float, nullable=True)
    avg_heartrate = Column(Integer, nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("T_USERS", back_populates="workouts")


class T_TRAINING_PLANS(Base):
    __tablename__ = "T_TRAINING_PLANS"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("T_USERS.id"), nullable=False)
    week_start = Column(Date, nullable=False)
    summary = Column(Text, nullable=True)
    risk_level = Column(String(20), nullable=True)      # baixo, médio, alto
    alerts = Column(Text, nullable=True)                # alertas da 1E, em texto
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sessions = relationship("T_PLANNED_SESSIONS", back_populates="plan", cascade="all, delete-orphan")


class T_PLANNED_SESSIONS(Base):
    __tablename__ = "T_PLANNED_SESSIONS"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("T_TRAINING_PLANS.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("T_USERS.id"), nullable=False)
    session_date = Column(Date, nullable=False)
    session_type = Column(String(30), nullable=False)   # rodagem, intervalado, longao, descanso
    distance_km = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    rain_probability = Column(Integer, nullable=True)   # nulo se sem previsão
    weather_note = Column(String(255), nullable=True)

    plan = relationship("T_TRAINING_PLANS", back_populates="sessions")