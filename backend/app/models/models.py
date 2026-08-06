from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Industry(Base):
    __tablename__ = "industries"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, default="")
    service_type = Column(String, default="")
    clients = relationship("Client", back_populates="industry_rel")


class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    voivodeship = Column(String, index=True, nullable=False)
    county = Column(String, default="")
    city = Column(String, default="")
    clients = relationship("Client", back_populates="location_rel")


class VoivodeshipStatus(Base):
    __tablename__ = "voivodeship_statuses"
    id = Column(Integer, primary_key=True, index=True)
    voivodeship = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="nie_rozpoczete")  # nie_rozpoczete, w_trakcie, zakonczone, ponowny_skan
    priority = Column(Integer, default=0)
    last_scan = Column(DateTime, nullable=True)
    clients_count = Column(Integer, default=0)
    orders_count = Column(Integer, default=0)
    error_message = Column(Text, default="")


class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, index=True, default="default")  # developer platform foundation
    company_name = Column(String, index=True, nullable=False)
    industry = Column(String, index=True, nullable=False)
    industry_id = Column(Integer, ForeignKey("industries.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    voivodeship = Column(String, index=True, default="")
    county = Column(String, default="")
    city = Column(String, default="")
    email = Column(String, default="")
    phone = Column(String, default="")
    website = Column(String, default="")
    source_type = Column(String, default="")  # katalog, mapa, rejestr, social, ogloszenia
    source_detail = Column(String, default="")
    acquired_at = Column(DateTime, default=func.now())
    status = Column(String, default="nowy")  # nowy, zweryfikowany, odrzucony

    industry_rel = relationship("Industry", back_populates="clients")
    location_rel = relationship("Location", back_populates="clients")
    orders = relationship("Order", back_populates="client")


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, index=True, default="default")  # developer platform foundation
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    value = Column(Float, default=0.0)
    status = Column(String, default="nowe")  # nowe, do_kontaktu, w_trakcie, zakonczone
    created_at = Column(DateTime, default=func.now())

    client = relationship("Client", back_populates="orders")
    history = relationship("OrderHistory", back_populates="order")


class OrderHistory(Base):
    __tablename__ = "order_history"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    note = Column(Text, default="")
    status_change = Column(String, default="")
    created_at = Column(DateTime, default=func.now())

    order = relationship("Order", back_populates="history")


class AcquisitionLog(Base):
    __tablename__ = "acquisition_logs"
    id = Column(Integer, primary_key=True, index=True)
    voivodeship = Column(String, index=True)
    industries = Column(String)  # comma-separated
    source_type = Column(String)
    found = Column(Integer, default=0)
    accepted = Column(Integer, default=0)
    rejected = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
