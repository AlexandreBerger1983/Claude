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
    country: str = "Canada"
    hourly_rate: float = 0.0
    tps_number: str = ""   # Numéro de TPS du client (si applicable)
    tvq_number: str = ""   # Numéro de TVQ du client (si applicable)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "email": self.email,
            "address": self.address,
            "city": self.city,
            "postal_code": self.postal_code,
            "country": self.country,
            "hourly_rate": self.hourly_rate,
            "tps_number": self.tps_number,
            "tvq_number": self.tvq_number,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Client":
        # Compatibilité ascendante: vat_number → tps_number
        if "vat_number" in d and "tps_number" not in d:
            d = dict(d)
            d["tps_number"] = d.pop("vat_number", "")
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
    country: str = "Canada"
    province: str = "Québec"
    email: str = ""
    phone: str = ""
    # Numéros fiscaux québécois
    tps_number: str = ""    # Ex: 123456789 RT0001
    tvq_number: str = ""    # Ex: 1234567890 TQ0001
    neq: str = ""           # Numéro d'entreprise du Québec
    # Taxes
    tps_rate: float = 5.0
    tvq_rate: float = 9.975
    # Paiement
    payment_terms_days: int = 30
    bank_info: str = ""     # Informations bancaires libres (institution, transit, compte)
    # Devise
    currency: str = "CAD"
    currency_symbol: str = "$"
    # Facturation
    invoice_prefix: str = "FAC"
    invoice_counter: int = 1

    # ── Propriétés calculées ──────────────────────────────────────────
    @property
    def tax_rate(self) -> float:
        """Taux combiné TPS+TVQ (pour compatibilité)."""
        return self.tps_rate + self.tvq_rate

    def to_dict(self) -> dict:
        d = self.__dict__.copy()
        # Supprimer les propriétés calculées (pas de __dict__ entry pour les @property)
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "CompanyInfo":
        obj = cls()
        # Compatibilité ascendante avec les anciens champs
        mapping = {
            "vat_number": "tps_number",
            "siret": "neq",
            "bank_iban": "bank_info",
        }
        d = dict(d)
        for old, new in mapping.items():
            if old in d and new not in d:
                d[new] = d.pop(old)
            elif old in d:
                d.pop(old)
        # Supprimer les champs qui n'existent plus
        obsolete = {"tax_rate", "bank_bic", "bank_iban", "siret", "vat_number",
                    "currency_symbol"}
        for k in obsolete:
            d.pop(k, None)
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
    def tps_amount(self) -> float:
        return self.subtotal * self.company.tps_rate / 100

    @property
    def tvq_amount(self) -> float:
        return self.subtotal * self.company.tvq_rate / 100

    @property
    def total(self) -> float:
        return self.subtotal + self.tps_amount + self.tvq_amount

    @property
    def total_hours(self) -> float:
        return sum(e.hours for e in self.entries)


@dataclass
class InvoiceRecord:
    """Facture émise, conservée dans l'historique (config JSON)."""
    invoice_number: str
    client_name: str
    issue_date: str            # ISO "2026-07-15"
    due_date: str
    subtotal: float = 0.0
    tps: float = 0.0
    tvq: float = 0.0
    total: float = 0.0
    hours: float = 0.0
    status: str = "En attente"  # "En attente" | "Payée"
    notes: str = ""
    event_ids: List[str] = field(default_factory=list)
    # Instantanés au moment de l'émission (pour régénérer le PDF à l'identique)
    entries: List[dict] = field(default_factory=list)   # {date, description, hours}
    client: dict = field(default_factory=dict)
    company: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return self.__dict__.copy()

    @classmethod
    def from_dict(cls, d: dict) -> "InvoiceRecord":
        valid = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        return cls(**valid)

    @property
    def is_overdue(self) -> bool:
        if self.status == "Payée":
            return False
        try:
            return datetime.fromisoformat(self.due_date).date() < datetime.now().date()
        except ValueError:
            return False

    @property
    def display_status(self) -> str:
        if self.status == "Payée":
            return "Payée"
        return "En retard" if self.is_overdue else "En attente"

    def to_invoice(self) -> Invoice:
        """Reconstruit un objet Invoice depuis les instantanés (pour re-générer le PDF)."""
        return Invoice(
            invoice_number=self.invoice_number,
            client=Client.from_dict(self.client),
            company=CompanyInfo.from_dict(self.company),
            entries=[
                TimeEntry(
                    date=datetime.fromisoformat(e["date"]),
                    description=e.get("description", ""),
                    hours=float(e.get("hours", 0)),
                    client_name=self.client_name,
                    event_id=e.get("event_id", ""),
                )
                for e in self.entries
            ],
            issue_date=datetime.fromisoformat(self.issue_date),
            due_date=datetime.fromisoformat(self.due_date),
            notes=self.notes,
        )
