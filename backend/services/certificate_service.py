import os
import io
import base64
import uuid
import qrcode
from jinja2 import Environment, FileSystemLoader
from datetime import datetime

class CertificateService:
    def __init__(self):
        # Setup Jinja2 environment
        template_dir = os.path.join(os.path.dirname(__file__), '../templates')
        os.makedirs(template_dir, exist_ok=True)
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True
        )

    async def generate_certificate_pdf(self, cert_data: dict):
        """
        Generates a professional PDF certificate using HTML/CSS templates.
        """
        # 1. Create a basic HTML template if it doesn't exist
        template_path = os.path.join(os.path.dirname(__file__), '../templates/certificate_template.html')
        if not os.path.exists(template_path):
            self._create_default_template(template_path)

        # 2. Render HTML with data
        template = self.jinja_env.get_template('certificate_template.html')
        participant_name = cert_data.get('participant_name') or cert_data.get('recipient_name') or cert_data.get('student_name') or 'Participant'
        event_name = cert_data.get('event_name') or cert_data.get('event_title') or 'Studlyf Event'
        organization_name = cert_data.get('organization_name') or cert_data.get('organization') or cert_data.get('institution_name') or 'Studlyf'
        event_date = cert_data.get('event_date') or cert_data.get('issued_date') or datetime.now().strftime("%B %d, %Y")
        certificate_id = cert_data.get('certificate_id') or cert_data.get('cert_id') or f"STUD-{uuid.uuid4().hex[:8].upper()}"
        verification_url = cert_data.get('verification_url') or cert_data.get('verify_url') or f"{os.getenv('FRONTEND_URL', 'https://studlyf.in')}/#/verify/{certificate_id}"
        achievement_type = cert_data.get('achievement_type') or cert_data.get('category') or 'Participation'
        organizer_signature = cert_data.get('organizer_signature') or organization_name
        studlyf_signature = cert_data.get('studlyf_signature') or 'Studlyf Authorized Signature'
        qr_blob = self._generate_qr_blob(verification_url)
        html_content = template.render(
            participant_name=participant_name,
            event_name=event_name,
            organization_name=organization_name,
            event_date=event_date,
            issued_date=datetime.now().strftime("%B %d, %Y"),
            certificate_id=certificate_id,
            verification_url=verification_url,
            qr_blob=qr_blob,
            achievement_type=achievement_type,
            organizer_signature=organizer_signature,
            studlyf_signature=studlyf_signature,
        )

        # 3. Convert to PDF
        pdf_path = f"artifacts/certs/cert_{cert_data.get('certificate_id')}.pdf"
        os.makedirs("artifacts/certs", exist_ok=True)
        
        try:
            from weasyprint import HTML
            HTML(string=html_content).write_pdf(pdf_path)
            return pdf_path
        except Exception as e:
            html_path = f"artifacts/certs/cert_{cert_data.get('certificate_id')}.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"[WARNING] WeasyPrint failed to compile PDF: {e}. Saved certificate as HTML fallback at {html_path}")
            return html_path

    def _create_default_template(self, path):
        with open(path, 'w', encoding='utf-8') as f:
            f.write("""
<!DOCTYPE html>
<html>
<head>
    <style>
        @page { size: landscape; margin: 0; }
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;800;900&display=swap');
        body { font-family: 'Outfit', sans-serif; text-align: center; color: #111827; background: #f8fafc; margin: 0; }
        .page { padding: 40px; }
        .cert { border: 14px solid #6C3BFF; background: #ffffff; padding: 56px 72px; max-width: 1100px; margin: 0 auto; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08); }
        .eyebrow { font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; color: #6b7280; font-weight: 700; }
        .title { font-size: 34px; letter-spacing: 0.18em; color: #111827; font-weight: 900; margin-top: 12px; }
        .subtitle { font-size: 15px; color: #6b7280; margin-top: 8px; }
        .presented { font-size: 18px; color: #4b5563; margin-top: 34px; }
        .name { font-size: 50px; margin: 16px 0 10px; font-weight: 900; color: #6C3BFF; border-bottom: 2px solid #e5e7eb; display: inline-block; padding: 0 24px 10px; }
        .event { font-size: 28px; font-weight: 800; margin: 10px 0; color: #111827; }
        .org { font-size: 20px; font-weight: 700; margin-top: 4px; color: #374151; }
        .body { max-width: 780px; margin: 22px auto 0; font-size: 18px; line-height: 1.8; color: #374151; }
        .meta { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
        .meta-item { text-align: left; font-size: 13px; color: #374151; }
        .meta-item strong { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; margin-bottom: 6px; }
        .signatures { margin-top: 38px; display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; }
        .signature { width: 33%; border-top: 1px solid #111827; padding-top: 10px; font-size: 13px; color: #111827; }
        .signature small { display: block; color: #6b7280; margin-top: 4px; }
        .qr { width: 120px; height: 120px; }
        .verify { font-size: 12px; color: #6b7280; word-break: break-all; margin-top: 8px; }
    </style>
</head>
<body>
    <div class="page">
        <div class="cert">
            <div class="eyebrow">Studlyf Verified Certificate</div>
            <div class="title">CERTIFICATE OF {{ achievement_type | upper }}</div>
            <div class="subtitle">Issued through the Studlyf platform</div>
            <div class="presented">This certificate is proudly presented to</div>
            <div class="name">{{ participant_name }}</div>
            <div class="body">
                for successfully participating in<br>
                <span class="event">“{{ event_name }}”</span><br>
                organized by<br>
                <span class="org">{{ organization_name }}</span><br>
                through the Studlyf platform on {{ event_date }}.
                <br><br>
                The participant demonstrated enthusiasm, commitment, and active involvement throughout the event.
                <br><br>
                We appreciate their participation and wish them continued success in their learning and professional journey.
            </div>

            <div class="meta">
                <div class="meta-item">
                    <strong>Certificate ID</strong>
                    {{ certificate_id }}
                </div>
                <div class="meta-item" style="text-align:right;">
                    <strong>Issued Date</strong>
                    {{ issued_date }}
                    <div class="verify">Verify: {{ verification_url }}</div>
                </div>
                <div style="text-align:center;">
                    <img class="qr" src="data:image/png;base64,{{ qr_blob }}">
                </div>
            </div>

            <div class="signatures">
                <div class="signature">Organizer Signature<small>{{ organizer_signature }}</small></div>
                <div class="signature" style="text-align:center;">Studlyf Authorized Signature<small>{{ studlyf_signature }}</small></div>
                <div class="signature" style="text-align:right;">Verification Seal<small>QR links to public verification</small></div>
            </div>
        </div>
    </div>
    </div>
</body>
</html>

    def _generate_qr_blob(self, url: str):
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode()
""")

certificate_service = CertificateService()
