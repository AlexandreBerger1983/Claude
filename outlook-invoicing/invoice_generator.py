import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter  # Format lettre (standard Québec/Canada)
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
ACCENT  = colors.HexColor("#2e7bcf")
LIGHT_BG = colors.HexColor("#f0f4f8")
TEXT    = colors.HexColor("#2d3748")
BORDER  = colors.HexColor("#e2e8f0")

PAGE_W, PAGE_H = letter
MARGIN = 2 * cm


class InvoiceGenerator:
    def generate_pdf(self, invoice: Invoice) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
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
    # Chrome (bandes haut / bas)
    # ------------------------------------------------------------------

    def _draw_chrome(self, c, doc):
        c.saveState()
        c.setFillColor(PRIMARY)
        c.rect(0, PAGE_H - 12 * mm, PAGE_W, 12 * mm, fill=1, stroke=0)
        c.setFillColor(PRIMARY)
        c.rect(0, 0, PAGE_W, 8 * mm, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 7)
        c.drawCentredString(
            PAGE_W / 2, 2.5 * mm,
            "Document généré automatiquement — Facturation Outlook"
        )
        c.restoreState()

    # ------------------------------------------------------------------
    # Contenu
    # ------------------------------------------------------------------

    def _build_story(self, invoice: Invoice, styles):
        company = invoice.company
        client  = invoice.client
        sym     = company.currency_symbol or "$"

        story = []
        story.append(Spacer(1, 6 * mm))

        # ── En-tête ──────────────────────────────────────────────────
        s_co_name = ParagraphStyle("CoN", fontSize=22, fontName="Helvetica-Bold",
                                    textColor=PRIMARY, leading=26)
        s_small   = ParagraphStyle("Sm", fontSize=8.5, textColor=TEXT, leading=13)
        s_inv_lbl = ParagraphStyle("IL", fontSize=26, fontName="Helvetica-Bold",
                                    textColor=ACCENT, alignment=TA_RIGHT)
        s_inv_det = ParagraphStyle("ID", fontSize=10, textColor=TEXT,
                                    alignment=TA_RIGHT, leading=16)

        co_block  = self._company_block(company)
        inv_block = (
            f"<b>N°&nbsp;{invoice.invoice_number}</b><br/>"
            f"Date&nbsp;: <b>{invoice.issue_date.strftime('%Y-%m-%d')}</b><br/>"
            f"Échéance&nbsp;: <b>{invoice.due_date.strftime('%Y-%m-%d')}</b>"
        )

        hdr = Table(
            [[
                [Paragraph(company.name or "Mon Entreprise", s_co_name),
                 Paragraph(co_block, s_small)],
                [Paragraph("FACTURE", s_inv_lbl),
                 Paragraph(inv_block, s_inv_det)],
            ]],
            colWidths=["55%", "45%"],
        )
        hdr.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
        story.append(hdr)
        story.append(Spacer(1, 5 * mm))
        story.append(HRFlowable(width="100%", thickness=2, color=ACCENT))
        story.append(Spacer(1, 6 * mm))

        # ── Adresse client ───────────────────────────────────────────
        s_wh  = ParagraphStyle("WH", fontSize=8.5, fontName="Helvetica-Bold",
                                textColor=colors.white)
        s_cli = ParagraphStyle("CL", fontSize=10, textColor=TEXT, leading=15)

        cli_tbl = Table(
            [
                [Paragraph("FACTURER À", s_wh)],
                [Paragraph(self._client_block(client), s_cli)],
            ],
            colWidths=["48%"],
        )
        cli_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BACKGROUND", (0, 1), (-1, 1), LIGHT_BG),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ]))
        story.append(cli_tbl)
        story.append(Spacer(1, 8 * mm))

        # ── Tableau des prestations ──────────────────────────────────
        s_th  = ParagraphStyle("TH", fontSize=9, fontName="Helvetica-Bold",
                                textColor=colors.white, leading=12)
        s_thr = ParagraphStyle("THR", fontSize=9, fontName="Helvetica-Bold",
                                textColor=colors.white, leading=12, alignment=TA_RIGHT)
        s_td  = ParagraphStyle("TD", fontSize=9, textColor=TEXT, leading=12)
        s_tdr = ParagraphStyle("TDR", fontSize=9, textColor=TEXT, leading=12,
                                alignment=TA_RIGHT)

        rows = [[
            Paragraph("Date", s_th),
            Paragraph("Description", s_th),
            Paragraph("Heures", s_thr),
            Paragraph(f"Taux ({sym}/h)", s_thr),
            Paragraph(f"Montant ({sym})", s_thr),
        ]]
        for e in invoice.entries:
            rows.append([
                Paragraph(e.date.strftime("%Y-%m-%d"), s_td),
                Paragraph(e.description or "—", s_td),
                Paragraph(f"{e.hours:.2f}", s_tdr),
                Paragraph(f"{client.hourly_rate:.2f}", s_tdr),
                Paragraph(f"{e.hours * client.hourly_rate:.2f}", s_tdr),
            ])

        svc = Table(rows, colWidths=[28*mm, None, 22*mm, 28*mm, 28*mm], repeatRows=1)
        svc.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), PRIMARY),
            ("LINEBELOW",     (0, 0), (-1, 0), 1.5, ACCENT),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, LIGHT_BG]),
            ("GRID",          (0, 1), (-1, -1), 0.3, BORDER),
            ("LINEBELOW",     (0, -1), (-1, -1), 1.5, PRIMARY),
            ("TOPPADDING",    (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(svc)
        story.append(Spacer(1, 5 * mm))

        # ── Totaux (sous-total + TPS + TVQ + TOTAL) ──────────────────
        s_tot = ParagraphStyle("Tot", fontSize=10, textColor=TEXT,
                                alignment=TA_RIGHT, leading=16)
        s_grd = ParagraphStyle("Grd", fontSize=12, fontName="Helvetica-Bold",
                                textColor=colors.white, alignment=TA_RIGHT)
        s_hrs = ParagraphStyle("Hrs", fontSize=9, textColor=TEXT)

        subtotal   = invoice.subtotal
        tps_amount = invoice.tps_amount
        tvq_amount = invoice.tvq_amount
        total      = invoice.total
        total_h    = invoice.total_hours

        tot_rows = [
            [Paragraph(f"Total : <b>{total_h:.2f} h</b>", s_hrs),
             Paragraph("Sous-total", s_tot),
             Paragraph(f"{subtotal:.2f}&nbsp;{sym}", s_tot)],
        ]
        if company.tps_rate > 0:
            tps_lbl = f"TPS ({company.tps_rate:.1f}%)"
            if company.tps_number:
                tps_lbl += f" — N° {company.tps_number}"
            tot_rows.append([
                "",
                Paragraph(tps_lbl, s_tot),
                Paragraph(f"{tps_amount:.2f}&nbsp;{sym}", s_tot),
            ])
        if company.tvq_rate > 0:
            tvq_lbl = f"TVQ ({company.tvq_rate:.3f}%)"
            if company.tvq_number:
                tvq_lbl += f" — N° {company.tvq_number}"
            tot_rows.append([
                "",
                Paragraph(tvq_lbl, s_tot),
                Paragraph(f"{tvq_amount:.2f}&nbsp;{sym}", s_tot),
            ])
        tot_rows.append([
            "",
            Paragraph("TOTAL", s_grd),
            Paragraph(f"<b>{total:.2f}&nbsp;{sym}</b>", s_grd),
        ])

        last = len(tot_rows) - 1
        tot = Table(tot_rows, colWidths=["50%", "33%", "17%"])
        tot.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
            ("BACKGROUND",    (1, last), (2, last), PRIMARY),
            ("LINEABOVE",     (1, last), (2, last), 1.5, ACCENT),
        ]))
        story.append(tot)
        story.append(Spacer(1, 8 * mm))

        # ── Paiement ─────────────────────────────────────────────────
        pay_lines = []
        if company.bank_info:
            pay_lines.append(f"<b>{company.bank_info}</b>")
        pay_lines.append(
            f"Paiement dû dans <b>{company.payment_terms_days} jours</b>"
        )
        if invoice.notes:
            pay_lines.append(f"<i>{invoice.notes}</i>")

        pay_tbl = Table(
            [
                [Paragraph("INFORMATIONS DE PAIEMENT", s_wh)],
                [Paragraph("<br/>".join(pay_lines),
                           ParagraphStyle("Pay", fontSize=9, textColor=TEXT, leading=15))],
            ],
            colWidths=["100%"],
        )
        pay_tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), ACCENT),
            ("BACKGROUND",    (0, 1), (-1, 1), LIGHT_BG),
            ("TOPPADDING",    (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ]))
        story.append(pay_tbl)
        return story

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _company_block(self, company) -> str:
        parts = []
        if company.address:
            parts.append(company.address)
        loc = f"{company.city} ({company.province})  {company.postal_code}".strip()
        if loc.strip("() "):
            parts.append(loc)
        if company.country:
            parts.append(company.country)
        if company.email:
            parts.append(company.email)
        if company.phone:
            parts.append(company.phone)
        if company.neq:
            parts.append(f"NEQ : {company.neq}")
        if company.tps_number:
            parts.append(f"N° TPS : {company.tps_number}")
        if company.tvq_number:
            parts.append(f"N° TVQ : {company.tvq_number}")
        return "<br/>".join(parts)

    def _client_block(self, client) -> str:
        parts = [f"<b>{client.name}</b>"]
        if client.address:
            parts.append(client.address)
        loc = f"{client.city}  {client.postal_code}".strip()
        if loc.strip():
            parts.append(loc)
        if client.country:
            parts.append(client.country)
        if client.email:
            parts.append(client.email)
        if client.tps_number:
            parts.append(f"N° TPS : {client.tps_number}")
        if client.tvq_number:
            parts.append(f"N° TVQ : {client.tvq_number}")
        return "<br/>".join(parts)
