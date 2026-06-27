import asyncio
import logging
from db import db
from models.certificate_batch_models import BatchStatus
from models.certificate_record_models import CertificateRecord, CertificateStatus
from services.certificate_generation_service_utils import (
    generate_certificate_id, generate_verification_code, 
    generate_qr_code, render_certificate_pdf
)
from datetime import datetime

logger = logging.getLogger("cert_gen_service")

class CertificateGenerationService:
    async def process_batch(self, batch_id: str):
        batch = await db.certificate_batches.find_one({"batch_id": batch_id})
        if not batch or batch["status"] != BatchStatus.QUEUED:
            return

        # Atomic lock
        await db.certificate_batches.update_one(
            {"batch_id": batch_id, "status": BatchStatus.QUEUED},
            {"$set": {"status": BatchStatus.PROCESSING, "started_at": datetime.utcnow()}}
        )

        try:
            # Get eligibility snapshot
            eligibles = batch["eligibility_snapshot"]
            total = len(eligibles)
            
            for i, recipient in enumerate(eligibles):
                try:
                    await self.generate_single(recipient, batch)
                    # Update progress
                    await db.certificate_batches.update_one(
                        {"batch_id": batch_id},
                        {"$inc": {"counts.generated": 1}, "$set": {"progress_percentage": ((i+1)/total)*100}}
                    )
                except Exception as e:
                    logger.error(f"Failed to generate for {recipient}: {e}")
                    # Update batch error
            
            await db.certificate_batches.update_one({"batch_id": batch_id}, {"$set": {"status": BatchStatus.COMPLETED, "completed_at": datetime.utcnow()}})
        except Exception as e:
            await db.certificate_batches.update_one({"batch_id": batch_id}, {"$set": {"status": BatchStatus.FAILED}})
            raise e

    async def generate_single(self, recipient: dict, batch: dict):
        cert_id = await generate_certificate_id(batch["batch_type"])
        v_code = await generate_unique_verification_code()
        frontend_url = os.getenv("FRONTEND_URL", "https://studlyf.in")
        url = f"{frontend_url}/#/verify/{cert_id}"
        
        # 1. Generate QR Assets
        qr_assets = await generate_qr_assets(url, cert_id)
        
        # 2. Render PDF
        template = await db.certificate_templates.find_one({"template_id": batch["template_ids"][0], "template_version": batch["template_versions"][batch["template_ids"][0]]})
        pdf_path = await render_certificate_pdf(template, recipient["render_data"], cert_id)
        
        # 3. Create CertificateRecord
        try:
            record = CertificateRecord(
                certificate_id=cert_id,
                verification_code=v_code,
                qr_image_url=qr_assets["png"],
                # qr_svg_url=qr_assets["svg"], # Add this to schema if needed
                pdf_url=pdf_path,
                recipient_user_id=recipient["user_id"],
                recipient_name=recipient["name"],
                recipient_email=recipient["email"],
                event_id=batch["event_id"],
                event_name=batch["event_name"],
                rule_id=batch["rule_ids"][0],
                template_id=batch["template_ids"][0],
                template_version=batch["template_versions"][batch["template_ids"][0]],
                snapshot_id=batch["snapshot_ids"][0],
                certificate_type=batch["batch_type"],
                award_label="Winner",
                certificate_category="achievement",
                render_data=recipient["render_data"],
                status=CertificateStatus.GENERATED,
                batch_id=batch["batch_id"]
            )
            await db.certificate_records.insert_one(record.dict())
        except Exception as e:
            # Update batch failure reasons
            await db.certificate_batches.update_one(
                {"batch_id": batch["batch_id"]},
                {"$push": {"failure_reasons": {"cert_id": cert_id, "reason": str(e)}}}
            )
            raise e
