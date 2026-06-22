import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from models import Invoice

# Palette couleurs
PRIMARY = colors.HexColor("#1a3a5c")
ACCENT = colors.HexColor("#2e7bcf")
LIGHT_BG = colors.HexColor("#f0f4f8")
TEXT = colors.HexColor("#2d3748")
BORDER = colors.HexColor("#e2e8f0")

PAGE_W, PAGE_H = A4
MARGIN = 2 * cm


class InvoiceGenerator:
    def generate_pdf(self, invoice: Invoice) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=MARGIN,
            leftMargin=MARGIN,
            topMargin=MARGIN + 5 * mm,
            bottomMargin=MARGIN,
        )
        styles = getSampleStyleSheet()
        story = self._build_story(invoice, styles)
        doc.build(
            story,
            onFirstPage=self._draw_chrome,
            onLaterPages=self._draw_chrome,
        )
        return buffer.getvalue()

    # ------------------------------------------------------------------
    # Page chrome (header / footer bands)
    # ------------------------------------------------------------------

    def _draw_chrome(self, c, doc):
        c.saveState()

        # Bande bleue en haut
        c.setFillColor(PRIMARY)
        c.rect(0, PAGE_H - 12 * mm, PAGE_W, 12 * mm, fill=1, stroke=0)

        # Bande bleue en bas
        c.setFillColor(PRIMARY)
        c.rect(0, 0, PAGE_W, 8 * mm, fill=1, stroke=0)

        # Texte pied de page
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 7)
        c.drawCentredString(
            PAGE_W / 2, 2.5 * mm, "Document généré automatiquement — Facturation Outlook"
        )

        c.restoreState()

    # ------------------------------------------------------------------
    # Contenu
    # ------------------------------------------------------------------

    def _build_story(self, invoice: Invoice, styles):
        company = invoice.company
        client = invoice.client
        sym = company.currency_symbol or "€"

        story = []
        story.append(Spacer(1, 6 * mm))

        # ── En-tête: nom entreprise + bloc "FACTURE N°" ──────────────
        s_company_name = ParagraphStyle(
            "CName",
            fontSize=22,
            fontName="Helvetica-Bold",
            textColor=PRIMARY,
            leading=26,
        )
        s_detail_right = ParagraphStyle(
            "DR",
            fontSize=10,
            textColor=TEXT,
            alignment=TA_RIGHT,
            leading=16,
        )
        s_invoice_label = ParagraphStyle(
            "ILabel",
            fontSize=26,
            fontName="Helvetica-Bold",
            textColor=ACCENT,
            alignment=TA_RIGHT,
        )
        s_small = ParagraphStyle(
            "Small", fontSize=8.5, textColor=TEXT, leading=13
        )

        company_block = self._company_info_text(company)
        invoice_block = (
            f"<b>N° {invoice.invoice_number}</b><br/>"
            f"Date : <b>{invoice.issue_date.strftime('%d/%m/%Y')}</b><br/>"
            f"Échéance : <b>{invoice.due_date.strftime('%d/%m/%Y')}</b>"
        )

        header_tbl = Table(
            [[
                [Paragraph(company.name or "Mon Entreprise", s_company_name),
                 Paragraph(company_block, s_small)],
                [Paragraph("FACTURE", s_invoice_label),
                 Paragraph(invoice_block, s_detail_right)],
            ]],
            colWidths=["55%", "45%"],
        )
        header_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(header_tbl)

        story.append(Spacer(1, 5 * mm))
        story.append(HRFlowable(width="100%", thickness=2, color=ACCENT))
        story.append(Spacer(1, 6 * mm))

        # ── Adresse client ──────────────────────────────────────────
        s_white_bold = ParagraphStyle(
            "WB", fontSize=8.5, fontName="Helvetica-Bold", textColor=colors.white
        )
        s_client_body = ParagraphStyle(
            "CB", fontSize=10, textColor=TEXT, leading=15
        )

        client_block = self._client_info_text(client)

        client_tbl = Table(
            [
                [Paragraph("FACTURER À", s_white_bold)],
                [Paragraph(client_block, s_client_body)],
            ],
            colWidths=["48%"],
        )
        client_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BACKGROUND", (0, 1), (-1, 1), LIGHT_BG),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(client_tbl)
        story.append(Spacer(1, 8 * mm))

        # ── Tableau des prestations ──────────────────────────────────
        s_th = ParagraphStyle(
            "TH",
            fontSize=9,
            fontName="Helvetica-Bold",
            textColor=colors.white,
            leading=12,
        )
        s_td = ParagraphStyle(
            "TD", fontSize=9, textColor=TEXT, leading=12
        )
        s_td_r = ParagraphStyle(
            "TDR", fontSize=9, textColor=TEXT, leading=12, alignment=TA_RIGHT
        )

        header_row = [
            Paragraph("Date", s_th),
            Paragraph("Description", s_th),
            Paragraph("Heures", ParagraphStyle("THR", parent=s_th, alignment=TA_RIGHT)),
            Paragraph(f"Taux ({sym}/h)", ParagraphStyle("THR2", parent=s_th, alignment=TA_RIGHT)),
            Paragraph(f"Montant ({sym})", ParagraphStyle("THR3", parent=s_th, alignment=TA_RIGHT)),
        ]

        rows = [header_row]
        for entry in invoice.entries:
            amount = entry.hours * client.hourly_rate
            rows.append([
                Paragraph(entry.date.strftime("%d/%m/%Y"), s_td),
                Paragraph(entry.description or "—", s_td),
                Paragraph(f"{entry.hours:.2f}", s_td_r),
                Paragraph(f"{client.hourly_rate:.2f}", s_td_r),
                Paragraph(f"{amount:.2f}", s_td_r),
            ])

        col_widths = [28 * mm, None, 22 * mm, 28 * mm, 28 * mm]
        svc_tbl = Table(rows, colWidths=col_widths, repeatRows=1)

        tbl_style = [
            # En-tête
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("LINEBELOW", (0, 0), (-1, 0), 1.5, ACCENT),
            # Lignes de données
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
            ("GRID", (0, 1), (-1, -1), 0.3, BORDER),
            ("LINEBELOW", (0, -1), (-1, -1), 1.5, PRIMARY),
            # Paddings
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]
        svc_tbl.setStyle(TableStyle(tbl_style))
        story.append(svc_tbl)
        story.append(Spacer(1, 5 * mm))

        # ── Totaux ───────────────────────────────────────────────────
        s_tot_label = ParagraphStyle(
            "TotL", fontSize=10, textColor=TEXT, alignment=TA_RIGHT, leading=16
        )
        s_tot_value = ParagraphStyle(
            "TotV", fontSize=10, textColor=TEXT, alignment=TA_RIGHT, leading=16
        )
        s_grand_label = ParagraphStyle(
            "GLabel",
            fontSize=12,
            fontName="Helvetica-Bold",
            textColor=colors.white,
            alignment=TA_RIGHT,
        )
        s_grand_value = ParagraphStyle(
            "GValue",
            fontSize=12,
            fontName="Helvetica-Bold",
            textColor=colors.white,
            alignment=TA_RIGHT,
        )
        s_hours = ParagraphStyle(
            "Hours", fontSize=9, textColor=TEXT
        )

        subtotal = invoice.subtotal
        tax_amount = invoice.tax_amount
        total = invoice.total
        total_hours = invoice.total_hours

        tot_rows = [
            [
                Paragraph(f"Total : <b>{total_hours:.2f} h</b>", s_hours),
                Paragraph("Sous-total HT", s_tot_label),
                Paragraph(f"{subtotal:.2f} {sym}", s_tot_value),
            ],
        ]
        if company.tax_rate > 0:
            tot_rows.append([
                "",
                Paragraph(f"TVA ({company.tax_rate:.1f} %)", s_tot_label),
                Paragraph(f"{tax_amount:.2f} {sym}", s_tot_value),
            ])
        tot_rows.append([
            "",
            Paragraph("TOTAL TTC", s_grand_label),
            Paragraph(f"{total:.2f} {sym}", s_grand_value),
        ])

        last = len(tot_rows) - 1
        tot_tbl = Table(tot_rows, colWidths=["50%", "30%", "20%"])
        tot_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("BACKGROUND", (1, last), (2, last), PRIMARY),
            ("LINEABOVE", (1, last), (2, last), 1.5, ACCENT),
        ]))
        story.append(tot_tbl)
        story.append(Spacer(1, 8 * mm))

        # ── Informations de paiement ─────────────────────────────────
        payment_lines = []
        if company.bank_iban:
            payment_lines.append(f"IBAN : <b>{company.bank_iban}</b>")
        if company.bank_bic:
            payment_lines.append(f"BIC : <b>{company.bank_bic}</b>")
        payment_lines.append(
            f"Règlement sous <b>{company.payment_terms_days} jours</b>"
        )
        if invoice.notes:
            payment_lines.append(f"<i>{invoice.notes}</i>")

        payment_text = "<br/>".join(payment_lines)
        pay_tbl = Table(
            [
                [Paragraph("INFORMATIONS DE PAIEMENT", s_white_bold)],
                [Paragraph(payment_text, ParagraphStyle("Pay", fontSize=9, textColor=TEXT, leading=15))],
            ],
            colWidths=["100%"],
        )
        pay_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
            ("BACKGROUND", (0, 1), (-1, 1), LIGHT_BG),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(pay_tbl)

        return story

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _company_info_text(self, company) -> str:
        parts = []
        if company.address:
            parts.append(company.address)
        if company.postal_code or company.city:
            parts.append(f"{company.postal_code} {company.city}".strip())
        if company.country:
            parts.append(company.country)
        if company.email:
            parts.append(company.email)
        if company.phone:
            parts.append(company.phone)
        if company.vat_number:
            parts.append(f"TVA : {company.vat_number}")
        if company.siret:
            parts.append(f"SIRET : {company.siret}")
        return "<br/>".join(parts)

    def _client_info_text(self, client) -> str:
        parts = [f"<b>{client.name}</b>"]
        if client.address:
            parts.append(client.address)
        if client.postal_code or client.city:
            parts.append(f"{client.postal_code} {client.city}".strip())
        if client.country:
            parts.append(client.country)
        if client.email:
            parts.append(client.email)
        if client.vat_number:
            parts.append(f"TVA : {client.vat_number}")
        return "<br/>".join(parts)
