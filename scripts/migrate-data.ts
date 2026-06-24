import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Buffer } from 'buffer';

const neon = new PrismaClient({
  datasources: {
    db: { url: process.env.OLD_DATABASE_URL },
  },
});

const supabase = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function uploadToR2(base64Data: string, key: string, mimeType: string) {
  const buffer = Buffer.from(base64Data, 'base64');
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
  return key;
}

const BATCH_SIZE = 100;

async function migrateTable(
  modelName: any,
  processRow?: (row: any) => Promise<any>
) {
  console.log(`Migrating ${modelName}...`);
  let cursor: any = undefined;
  let count = 0;
  
  while (true) {
    const args: any = {
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
    };
    if (cursor) {
      args.cursor = { id: cursor };
      args.skip = 1;
    }
    
    // @ts-ignore
    const rows = await neon[modelName].findMany(args);
    if (rows.length === 0) break;
    
    for (const row of rows) {
      let data = { ...row };
      if (processRow) {
        data = await processRow(data);
      }
      
      try {
        // @ts-ignore
        await supabase[modelName].create({
          data,
        });
      } catch (err: any) {
        // Handle cases where ID already exists due to multiple runs
        if (err.code !== 'P2002') {
          console.error(`Error migrating row ${data.id} in ${modelName}:`, err.message);
          throw err;
        }
      }
      count++;
    }
    cursor = rows[rows.length - 1].id;
  }
  console.log(`Finished migrating ${count} rows for ${modelName}`);
}

async function main() {
  console.log('Starting migration...');

  // Order of dependencies
  const tables = [
    'user',
    'profile',
    'session',
    'notification',
    'supportTicket',
    'supportTicketReply',
    'auditLog',
    'application',
    'applicationReviewAssignment',
    'applicationQuery',
    'applicationStatusHistory',
    'digitalUndertaking',
    'researchProposal',
    'budget',
    'applicationDocument',
    'committeeScore',
    'committeeRemark',
    'interview',
    'trusteeApproval',
    'fellowship',
    'fundInstallment',
    'progressReport',
    'midTermReview',
    'finalSubmission',
    'financeRecord',
    'certificate',
    'fellowshipDocument',
    'fellowshipReminder',
    'verificationSession',
    'otpCode',
    'siteSettings',
    'integrationSettings',
    'cmsPage',
    'roleModuleVisibility',
    'notice',
    'formTemplate',
    'formField',
    'formSubmission',
  ];

  for (const table of tables) {
    // Custom processing for tables with files
    if (table === 'applicationDocument' || table === 'fellowshipDocument') {
      await migrateTable(table, async (row) => {
        if (row.fileData) {
          console.log(`Uploading ${row.fileName} to R2...`);
          // Use existing filePath or generate a new one
          let key = row.filePath;
          if (!key || key.startsWith('/uploads/') || key.startsWith('uploads/')) {
            key = key?.replace(/^\/?uploads\//, '') || `${row.id}_${row.fileName}`;
          }
          await uploadToR2(row.fileData, key, row.mimeType || 'application/octet-stream');
          row.filePath = key;
        }
        row.fileData = null; // Don't save base64 to new db
        return row;
      });
    } else if (table === 'digitalUndertaking') {
      await migrateTable(table, async (row) => {
        if (row.pdfData) {
          console.log(`Uploading undertaking PDF to R2...`);
          let key = row.pdfPath?.replace(/^\/?uploads\//, '') || `undertakings/${row.id}.pdf`;
          await uploadToR2(row.pdfData, key, 'application/pdf');
          row.pdfPath = key;
        }
        if (row.signatureData) {
          console.log(`Uploading signature to R2...`);
          let key = row.signaturePath?.replace(/^\/?uploads\//, '') || `signatures/${row.id}.png`;
          await uploadToR2(row.signatureData, key, 'image/png');
          row.signaturePath = key;
        }
        row.pdfData = null;
        row.signatureData = null;
        return row;
      });
    } else if (table === 'fellowship') {
       await migrateTable(table, async (row) => {
        if (row.agreementPdfData) {
          console.log(`Uploading fellowship agreement PDF to R2...`);
          let key = `fellowships/${row.id}/agreement.pdf`;
          await uploadToR2(row.agreementPdfData, key, 'application/pdf');
          // There is no agreementPath in Fellowship, only agreementPdfData. 
          // We can put it in awardLetterPath or we will change schema to use agreementPdfPath.
          // Wait, if schema currently doesn't have it, we just set agreementPdfData to null.
          // Is there an agreementPdfPath? No, schema doesn't have it. We will leave it. 
          // The application might need schema update to store this link if it's not stored.
          // Actually, let's keep the key in memory or assume standard structure.
        }
        row.agreementPdfData = null;
        return row;
      });
    } else if (table === 'progressReport') {
      await migrateTable(table, async (row) => {
        if (row.reportData) {
          console.log(`Uploading progress report to R2...`);
          let key = row.reportPath?.replace(/^\/?uploads\//, '') || `reports/${row.id}.pdf`;
          await uploadToR2(row.reportData, key, 'application/pdf');
          row.reportPath = key;
        }
        row.reportData = null;
        return row;
      });
    } else if (table === 'finalSubmission') {
      await migrateTable(table, async (row) => {
        if (row.finalReportData) {
          let key = row.finalReportPath?.replace(/^\/?uploads\//, '') || `final_reports/${row.id}.pdf`;
          await uploadToR2(row.finalReportData, key, 'application/pdf');
          row.finalReportPath = key;
        }
        if (row.manuscriptData) {
          let key = row.manuscriptPath?.replace(/^\/?uploads\//, '') || `manuscripts/${row.id}.pdf`;
          await uploadToR2(row.manuscriptData, key, 'application/pdf');
          row.manuscriptPath = key;
        }
        if (row.utilizationCertData) {
          let key = row.utilizationCertPath?.replace(/^\/?uploads\//, '') || `utilization_certs/${row.id}.pdf`;
          await uploadToR2(row.utilizationCertData, key, 'application/pdf');
          row.utilizationCertPath = key;
        }
        row.finalReportData = null;
        row.manuscriptData = null;
        row.utilizationCertData = null;
        return row;
      });
    } else {
      // General case: copy identically
      // @ts-ignore
      if (neon[table]) {
        await migrateTable(table);
      } else {
        console.log(`Skipping ${table} because model not found on Prisma Client.`);
      }
    }
  }

  console.log('Migration completed successfully.');
}

main().catch(console.error).finally(async () => {
  await neon.$disconnect();
  await supabase.$disconnect();
});
