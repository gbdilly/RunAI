from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class T_USERS(Base):
    __tablename__ = "T_USERS"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamentos: um usuário tem 1 preferência e vários treinos
    preferences = relationship("T_PREFERENCES", back_populates="user", uselist=False)
    workouts = relationship("T_WORKOUTS", back_populates="user")


class T_PREFERENCES(Base):
    __tablename__ = "T_PREFERENCES"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("T_USERS.id"), nullable=False, unique=True)
    days_per_week = Column(Integer, nullable=False, default=3)   # quantos dias corre por semana
    preferred_days = Column(String(50))                          # ex: "seg,qua,sex"

    user = relationship("T_USERS", back_populates="preferences")


class T_WORKOUTS(Base):
    __tablename__ = "T_WORKOUTS"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("T_USERS.id"), nullable=False)
    workout_date = Column(Date, nullable=False)
    distance_km = Column(Float, nullable=False)
    duration_min = Column(Integer)
    notes = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("T_USERS", back_populates="workouts")