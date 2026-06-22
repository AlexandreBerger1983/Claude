from dataclasses import dataclass, field
from datetime import datetime
from typing import List


@dataclass
class Client:
    name: str
    email: str = ""
    address: str = ""
    city: str = ""
    postal_code: str = ""
    country: str = "France"
    hourly_rate: float = 0.0
    vat_number: str = ""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "email": self.email,
            "address": self.address,
            "city": self.city,
            "postal_code": self.postal_code,
            "country": self.country,
            "hourly_rate": self.hourly_rate,
            "vat_number": self.vat_number,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Client":
        valid = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        return cls(**valid)


@dataclass
class TimeEntry:
    date: datetime
    description: str
    hours: float
    client_name: str
    event_id: str = ""


@dataclass
class CompanyInfo:
    name: str = "Votre Entreprise"
    address: str = ""
    city: str = ""
    postal_code: str = ""
    country: str = "France"
    email: str = ""
    phone: str = ""
    vat_number: str = ""
    siret: str = ""
    bank_iban: str = ""
    bank_bic: str = ""
    currency: str = "EUR"
    currency_symbol: str = "€"
    tax_rate: float = 20.0
    payment_terms_days: int = 30
    invoice_prefix: str = "FAC"
    invoice_counter: int = 1

    def to_dict(self) -> dict:
        return self.__dict__.copy()

    @classmethod
    def from_dict(cls, d: dict) -> "CompanyInfo":
        obj = cls()
        for k, v in d.items():
            if hasattr(obj, k):
                setattr(obj, k, v)
        return obj


@dataclass
class Invoice:
    invoice_number: str
    client: Client
    company: CompanyInfo
    entries: List[TimeEntry]
    issue_date: datetime
    due_date: datetime
    notes: str = ""

    @property
    def subtotal(self) -> float:
        return sum(e.hours * self.client.hourly_rate for e in self.entries)

    @property
    def tax_amount(self) -> float:
        return self.subtotal * self.company.tax_rate / 100

    @property
    def total(self) -> float:
        return self.subtotal + self.tax_amount

    @property
    def total_hours(self) -> float:
        return sum(e.hours for e in self.entries)
