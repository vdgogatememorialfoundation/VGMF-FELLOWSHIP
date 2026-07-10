import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import archiver from "archiver";
import { formatDate } from "@/lib/utils";

const ALLOWED_ROLES = new Set(["ADMIN", "STAFF", "COADMIN"]);

// GET - Download complete backup of all submitted applications
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const format = searchParams.get("format") || "json";

    // Fetch all submitted applications with complete data
    const applications = await prisma.application.findMany({
      where: {
        status: { notIn: ["DRAFT", "INCOMPLETE"] },
      },
      include: {
        user: { include: { profile: true } },
        researchProposal: true,
        budget: true,
        documents: true,
        committeeScores: {
          include: {
            committeeUser: { include: { profile: true } },
          },
        },
        applicationScores: {
          include: {
            scores: true,
          },
        },
        interview: true,
        fellowship: {
          include: {
            installments: true,
            progressReports: true,
          },
        },
        statusHistory: { orderBy: { createdAt: "asc" } },
        committeeRemarks: {
          include: {
            committeeUser: { include: { profile: true } },
          },
        },
        applicationQueries: { orderBy: { createdAt: "asc" } },
        reviewAssignments: {
          include: {
            reviewer: { include: { profile: true } },
          },
        },
        digitalUndertaking: true,
        trusteeApproval: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    if (format === "json") {
      // Return as JSON
      const backupData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: user.email,
          totalApplications: applications.length,
          version: "1.0",
        },
        applications: applications.map(formatApplication),
      };

      // Log the backup
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "BACKUP_DOWNLOADED",
          details: {
            format: "json",
            applicationCount: applications.length,
            downloadedAt: new Date().toISOString(),
          },
        },
      });

      return new NextResponse(JSON.stringify(backupData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="vgmf_backup_${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }

    // Generate ZIP with multiple files
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("error", (err) => {
      throw err;
    });

    // Add main data file
    const backupData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
        totalApplications: applications.length,
        version: "1.0",
      },
      applications: applications.map(formatApplication),
    };
    archive.append(JSON.stringify(backupData, null, 2), { name: "applications_complete.json" });

    // Add summary CSV
    const summaryCsv = generateSummaryCsv(applications);
    archive.append(summaryCsv, { name: "applications_summary.csv" });

    // Add detailed CSV
    const detailedCsv = generateDetailedCsv(applications);
    archive.append(detailedCsv, { name: "applications_detailed.csv" });

    // Add documents list (not actual files)
    const documentsList = applications.flatMap((app) =>
      app.documents.map((doc) => ({
        applicationNumber: app.applicationNumber,
        applicantName: app.name,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt,
        status: doc.status,
      }))
    );
    archive.append(JSON.stringify(documentsList, null, 2), { name: "documents_list.json" });

    // Add scores CSV
    const scoresCsv = generateScoresCsv(applications);
    archive.append(scoresCsv, { name: "scores_all.csv" });

    // Add status history CSV
    const statusCsv = generateStatusHistoryCsv(applications);
    archive.append(statusCsv, { name: "status_history.csv" });

    // Add fellowships CSV
    const fellowshipsCsv = generateFellowshipsCsv(applications);
    archive.append(fellowshipsCsv, { name: "fellowships.csv" });

    // Add interviews CSV
    const interviewsCsv = generateInterviewsCsv(applications);
    archive.append(interviewsCsv, { name: "interviews.csv" });

    archive.finalize();

    // Wait for archive to complete
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
    });

    // Log the backup
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "BACKUP_DOWNLOADED",
        details: {
          format: "zip",
          applicationCount: applications.length,
          downloadedAt: new Date().toISOString(),
        },
      },
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="vgmf_backup_${new Date().toISOString().split("T")[0]}.zip"`,
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Failed to generate backup" }, { status: 500 });
  }
}

function formatApplication(app: any) {
  return {
    // Basic Info
    id: app.id,
    applicationNumber: app.applicationNumber,
    name: app.name,
    email: app.email,
    mobile: app.mobile,
    gender: app.gender,
    dob: app.dob,
    city: app.city,
    state: app.state,
    pincode: app.pincode,
    address: app.address,
    
    // Professional Info
    bamsCollege: app.bamsCollege,
    yearOfPassing: app.yearOfPassing,
    currentDesignation: app.currentDesignation,
    institutionName: app.institutionName,
    yearsOfPractice: app.yearsOfPractice,
    
    // Status & Timeline
    status: app.status,
    submittedAt: app.submittedAt,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    
    // Research Proposal
    researchProposal: app.researchProposal,
    
    // Budget
    budget: app.budget,
    
    // Documents (without file content)
    documents: app.documents.map((d: any) => ({
      id: d.id,
      documentType: d.documentType,
      fileName: d.fileName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      uploadedAt: d.uploadedAt,
      status: d.status,
      reviewedAt: d.reviewedAt,
      rejectionReason: d.rejectionReason,
    })),
    
    // Scores (Legacy)
    committeeScores: app.committeeScores.map((s: any) => ({
      reviewerId: s.committeeUserId,
      reviewerName: s.committeeUser.profile?.name || s.committeeUser.email,
      scientificMerit: s.scientificMerit,
      innovation: s.innovation,
      feasibility: s.feasibility,
      budgetJustification: s.budgetJustification,
      viddhakarmaRelevance: s.viddhakarmaRelevance,
      totalScore: s.totalScore,
      remarks: s.remarks,
      isSubmitted: s.isSubmitted,
      isShortlisted: s.isShortlisted,
      submittedAt: s.submittedAt,
    })),
    
    // Scores (New)
    applicationScores: app.applicationScores.map((s: any) => ({
      reviewerId: s.reviewerId,
      reviewerName: s.reviewerName,
      totalScore: s.totalScore,
      maxPossibleScore: s.maxPossibleScore,
      isSubmitted: s.isSubmitted,
      isLocked: s.isLocked,
      lockedAt: s.lockedAt,
      remarks: s.remarks,
      criteria: s.scores.map((c: any) => ({
        criteriaId: c.criteriaId,
        criteriaName: c.criteriaName,
        maxScore: c.maxScore,
        score: c.score,
      })),
    })),
    
    // Interview
    interview: app.interview ? {
      id: app.interview.id,
      interviewType: app.interview.interviewType,
      scheduledDate: app.interview.scheduledDate,
      scheduledTime: app.interview.scheduledTime,
      durationMinutes: app.interview.durationMinutes,
      meetingLink: app.interview.meetingLink,
      location: app.interview.location,
      address: app.interview.address,
      googleMapsUrl: app.interview.googleMapsUrl,
      panelMembers: app.interview.panelMembers,
      status: app.interview.status,
      feedback: app.interview.feedback,
      notes: app.interview.notes,
      cancellationReason: app.interview.cancellationReason,
      applicantNotifiedAt: app.interview.applicantNotifiedAt,
    } : null,
    
    // Fellowship
    fellowship: app.fellowship ? {
      id: app.fellowship.id,
      fellowshipId: app.fellowship.fellowshipId,
      fellowName: app.fellowship.fellowName,
      projectTitle: app.fellowship.projectTitle,
      institution: app.fellowship.institution,
      sanctionedAmount: app.fellowship.sanctionedAmount,
      duration: app.fellowship.duration,
      currentStage: app.fellowship.currentStage,
      startDate: app.fellowship.startDate,
      endDate: app.fellowship.endDate,
      isActive: app.fellowship.isActive,
      isCompleted: app.fellowship.isCompleted,
      installments: app.fellowship.installments,
      progressReports: app.fellowship.progressReports.map((r: any) => ({
        id: r.id,
        quarter: r.quarter,
        year: r.year,
        status: r.status,
        submittedAt: r.submittedAt,
        expenditure: r.expenditure,
        casesEnrolled: r.casesEnrolled,
      })),
    } : null,
    
    // Status History
    statusHistory: app.statusHistory.map((h: any) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedBy: h.changedBy,
      notes: h.notes,
      createdAt: h.createdAt,
    })),
    
    // Committee Remarks
    committeeRemarks: app.committeeRemarks.map((r: any) => ({
      reviewerName: r.committeeUser.profile?.name || r.committeeUser.email,
      remark: r.remark,
      createdAt: r.createdAt,
    })),
    
    // Queries
    applicationQueries: app.applicationQueries.map((q: any) => ({
      id: q.id,
      type: q.type,
      status: q.status,
      subject: q.subject,
      query: q.query,
      response: q.response,
      createdAt: q.createdAt,
      respondedAt: q.respondedAt,
    })),
    
    // Review Assignments
    reviewAssignments: app.reviewAssignments.map((a: any) => ({
      reviewerName: a.reviewer.profile?.name || a.reviewer.email,
      isActive: a.isActive,
      assignedAt: a.assignedAt,
    })),
    
    // Digital Undertaking
    digitalUndertaking: app.digitalUndertaking ? {
      submittedAt: app.digitalUndertaking.submittedAt,
      fullName: app.digitalUndertaking.fullName,
    } : null,
    
    // Trustee Approval
    trusteeApproval: app.trusteeApproval ? {
      approvedAt: app.trusteeApproval.approvedAt,
      approvedBy: app.trusteeApproval.approvedBy,
      notes: app.trusteeApproval.notes,
    } : null,
  };
}

function generateSummaryCsv(applications: any[]): string {
  const headers = [
    "Application Number",
    "Name",
    "Email",
    "Mobile",
    "Status",
    "Submitted Date",
    "Fellowship ID",
    "Fellowship Amount",
  ];
  
  const rows = applications.map((app) => [
    app.applicationNumber,
    app.name,
    app.email,
    app.mobile,
    app.status,
    app.submittedAt ? formatDate(app.submittedAt) : "",
    app.fellowship?.fellowshipId || "",
    app.fellowship?.sanctionedAmount || "",
  ]);
  
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function generateDetailedCsv(applications: any[]): string {
  const headers = [
    "App Number",
    "Name",
    "Email",
    "Mobile",
    "Gender",
    "City",
    "State",
    "BAMS College",
    "Year of Passing",
    "Designation",
    "Institution",
    "Years Practice",
    "Status",
    "Submitted Date",
    "Project Title",
    "Research Area",
    "Budget Total",
    "Docs Count",
    "Docs Verified",
    "Interview",
    "Fellowship ID",
    "Fellowship Amount",
    "Avg Score",
    "Reviewers",
  ];
  
  const rows = applications.map((app) => {
    const docsVerified = app.documents.filter((d: any) => d.status === "APPROVED").length;
    const avgScore = app.applicationScores.length > 0
      ? app.applicationScores.reduce((sum: number, s: any) => sum + s.totalScore, 0) / app.applicationScores.length
      : app.committeeScores.length > 0
      ? app.committeeScores.reduce((sum: number, s: any) => sum + s.totalScore, 0) / app.committeeScores.length
      : null;
    
    return [
      app.applicationNumber,
      app.name,
      app.email,
      app.mobile,
      app.gender,
      app.city,
      app.state,
      app.bamsCollege,
      app.yearOfPassing,
      app.currentDesignation,
      app.institutionName,
      app.yearsOfPractice,
      app.status,
      app.submittedAt ? formatDate(app.submittedAt) : "",
      app.researchProposal?.projectTitle || "",
      app.researchProposal?.researchArea || "",
      app.budget?.total || "",
      app.documents.length,
      docsVerified,
      app.interview ? "Yes" : "No",
      app.fellowship?.fellowshipId || "",
      app.fellowship?.sanctionedAmount || "",
      avgScore !== null ? avgScore.toFixed(2) : "",
      app.applicationScores.length + app.committeeScores.length,
    ];
  });
  
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function generateScoresCsv(applications: any[]): string {
  const headers = [
    "App Number",
    "Applicant Name",
    "Reviewer",
    "Scientific Merit",
    "Innovation",
    "Feasibility",
    "Budget",
    "Relevance",
    "Total Score",
    "Submitted",
    "Shortlisted",
  ];
  
  const rows: string[][] = [];
  
  applications.forEach((app) => {
    // Legacy scores
    app.committeeScores.forEach((s: any) => {
      rows.push([
        app.applicationNumber,
        app.name,
        s.committeeUser.profile?.name || s.committeeUser.email,
        String(s.scientificMerit),
        String(s.innovation),
        String(s.feasibility),
        String(s.budgetJustification),
        String(s.viddhakarmaRelevance),
        String(s.totalScore),
        s.isSubmitted ? "Yes" : "No",
        s.isShortlisted ? "Yes" : "No",
      ]);
    });
    
    // New scores
    app.applicationScores.forEach((s: any) => {
      const criteriaScores = s.scores.map((c: any) => `${c.criteriaName}:${c.score}/${c.maxScore}`).join("; ");
      rows.push([
        app.applicationNumber,
        app.name,
        s.reviewerName,
        criteriaScores,
        "",
        "",
        "",
        "",
        `${s.totalScore}/${s.maxPossibleScore}`,
        s.isSubmitted ? "Yes" : "No",
        "",
      ]);
    });
  });
  
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function generateStatusHistoryCsv(applications: any[]): string {
  const headers = [
    "App Number",
    "Applicant Name",
    "From Status",
    "To Status",
    "Notes",
    "Changed By",
    "Date",
  ];
  
  const rows = applications.flatMap((app) =>
    app.statusHistory.map((h: any) => [
      app.applicationNumber,
      app.name,
      h.fromStatus || "",
      h.toStatus,
      h.notes || "",
      h.changedBy,
      formatDate(h.createdAt),
    ])
  );
  
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function generateFellowshipsCsv(applications: any[]): string {
  const headers = [
    "App Number",
    "Applicant Name",
    "Fellowship ID",
    "Fellow Name",
    "Project Title",
    "Institution",
    "Sanctioned Amount",
    "Duration",
    "Current Stage",
    "Start Date",
    "End Date",
    "Active",
    "Completed",
  ];
  
  const rows = applications
    .filter((app) => app.fellowship)
    .map((app) => [
      app.applicationNumber,
      app.name,
      app.fellowship.fellowshipId,
      app.fellowship.fellowName,
      app.fellowship.projectTitle,
      app.fellowship.institution,
      String(app.fellowship.sanctionedAmount),
      app.fellowship.duration,
      app.fellowship.currentStage,
      app.fellowship.startDate ? formatDate(app.fellowship.startDate) : "",
      app.fellowship.endDate ? formatDate(app.fellowship.endDate) : "",
      app.fellowship.isActive ? "Yes" : "No",
      app.fellowship.isCompleted ? "Yes" : "No",
    ]);
  
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function generateInterviewsCsv(applications: any[]): string {
  const headers = [
    "App Number",
    "Applicant Name",
    "Email",
    "Interview Type",
    "Scheduled Date",
    "Scheduled Time",
    "Duration",
    "Location",
    "Panel Members",
    "Status",
    "Feedback",
    "Notes",
  ];
  
  const rows = applications
    .filter((app) => app.interview)
    .map((app) => [
      app.applicationNumber,
      app.name,
      app.email,
      app.interview.interviewType,
      formatDate(app.interview.scheduledDate),
      app.interview.scheduledTime,
      String(app.interview.durationMinutes),
      app.interview.location || "",
      app.interview.panelMembers,
      app.interview.status,
      app.interview.feedback || "",
      app.interview.notes || "",
    ]);
  
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
