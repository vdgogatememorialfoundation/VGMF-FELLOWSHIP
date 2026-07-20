/**
 * Seed script for Review Questionnaire
 * 
 * This script populates the database with the initial questionnaire
 * sections and questions for the Viddhakarma Research Fellowship.
 */

import { PrismaClient, ReviewSectionType, ReviewQuestionType } from "@prisma/client";

const prisma = new PrismaClient();

interface QuestionData {
  questionText: string;
  questionType: ReviewQuestionType;
  helpText?: string;
  placeholder?: string;
  maxScore?: number;
  weight: number;
  required: boolean;
  options?: string;
  minValue?: number;
  maxValue?: number;
  subsection?: string;
}

interface SectionData {
  name: string;
  type: ReviewSectionType;
  description: string;
  helpText?: string;
  weight: number;
  maxScore: number;
  questions: QuestionData[];
}

const questionnaireData: SectionData[] = [
  {
    name: "Scientific Validity and Research Question",
    type: "SCIENTIFIC_VALIDITY",
    description: "Assessment of the scientific validity, clarity, and relevance of the proposed research question",
    helpText: "Evaluate whether the proposed research addresses an important unanswered question in Viddhakarma research.",
    weight: 25,
    maxScore: 100,
    questions: [
      {
        questionText: "Is the proposed research question clear, specific, relevant, and scientifically valid?",
        questionType: "SCORE",
        helpText: "Consider: Is the question well-defined? Does it address a meaningful gap in knowledge?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Does the proposal address an important unanswered question or knowledge gap in Viddhakarma?",
        questionType: "SCORE",
        helpText: "Consider: What is the current state of evidence? How would this study advance knowledge?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Is the proposed study likely to generate new and meaningful evidence?",
        questionType: "SCORE",
        helpText: "Consider: Will the results contribute to existing knowledge? Are the expected outcomes realistic?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Is the study hypothesis clearly stated and scientifically testable?",
        questionType: "SCORE",
        helpText: "Consider: Is the hypothesis specific and measurable? Can it be tested with the proposed methodology?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Is the proposed research relevant to the clinical practice and development of Viddhakarma?",
        questionType: "SCORE",
        helpText: "Consider: Will findings be applicable to clinical settings? Do they support practice development?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Please provide detailed comments on the scientific validity of the proposal",
        questionType: "TEXT",
        helpText: "Include strengths, weaknesses, and specific concerns about the research question.",
        placeholder: "Enter your detailed assessment...",
        weight: 0,
        required: false,
      },
      {
        questionText: "How confident are you in your assessment of scientific validity?",
        questionType: "CONFIDENCE_LEVEL",
        helpText: "Your confidence in evaluating this specific aspect",
        maxScore: 5,
        weight: 0,
        required: true,
        minValue: 1,
        maxValue: 5,
      },
    ],
  },
  {
    name: "Contribution to Scientific Acceptance of Viddhakarma",
    type: "CONTRIBUTION",
    description: "Assessment of the study's potential to contribute to scientific validation",
    helpText: "Evaluate how this study contributes to building scientific evidence for Viddhakarma.",
    weight: 0,
    maxScore: 100,
    questions: [
      {
        questionText: "Is this study likely to contribute meaningfully to the scientific validation of Viddhakarma?",
        questionType: "SCORE",
        helpText: "Consider: How does this fit into the broader research landscape?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Can the proposed study generate evidence-based findings that can influence clinical practice?",
        questionType: "SCORE",
        helpText: "Consider: Are the outcomes clinically relevant? Will they inform practice guidelines?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Does the study address potential mechanisms of Viddhakarma in a scientifically rigorous manner?",
        questionType: "SCORE",
        helpText: "Consider: Is there a plausible biological or therapeutic mechanism? Is it adequately explained?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Will the study help establish standardized protocols for Viddhakarma?",
        questionType: "SCORE",
        helpText: "Consider: Does it aim to standardize procedures? Will results support protocol development?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Does the proposal demonstrate understanding of the current state of Viddhakarma research?",
        questionType: "SCORE",
        helpText: "Consider: Is there adequate literature review? Are research gaps clearly identified?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Additional comments on contribution to scientific acceptance",
        questionType: "TEXT",
        helpText: "Any additional observations about the study's potential impact.",
        placeholder: "Enter additional comments...",
        weight: 0,
        required: false,
      },
    ],
  },
  {
    name: "Literature Review",
    type: "LITERATURE",
    description: "Assessment of the literature review quality and comprehensiveness",
    helpText: "Evaluate whether the proposal demonstrates adequate understanding of existing research.",
    weight: 0,
    maxScore: 100,
    questions: [
      {
        questionText: "Is the literature review comprehensive and up-to-date?",
        questionType: "SCORE",
        helpText: "Consider: Are recent studies included? Is the search strategy adequate?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Are there any significant missing references or key studies not cited?",
        questionType: "CHECKBOX",
        helpText: "Select if there are important studies that should have been cited.",
        options: "No missing references\nSome relevant studies missing\nMajor gaps in literature cited",
        weight: 0,
        required: true,
      },
      {
        questionText: "Does the literature review demonstrate critical analysis rather than mere summarization?",
        questionType: "SCORE",
        helpText: "Consider: Is there synthesis of findings? Are limitations of existing studies discussed?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Please list any missing key references or significant gaps in the literature review",
        questionType: "TEXT",
        helpText: "Provide specific suggestions for additional references if applicable.",
        placeholder: "Enter missing references or gaps...",
        weight: 0,
        required: false,
      },
    ],
  },
  {
    name: "Methodology",
    type: "METHODOLOGY",
    description: "Comprehensive assessment of study design, methods, and technical approach",
    helpText: "This is the most critical section. Evaluate every aspect of the research methodology.",
    weight: 25,
    maxScore: 100,
    questions: [
      {
        questionText: "Are the research objectives clearly stated, specific, and measurable?",
        questionType: "SCORE",
        subsection: "Objectives & Hypothesis",
        helpText: "Consider: Are objectives SMART (Specific, Measurable, Achievable, Relevant, Time-bound)?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Is the primary hypothesis clearly stated and testable?",
        questionType: "SCORE",
        subsection: "Objectives & Hypothesis",
        helpText: "Consider: Is the hypothesis derived logically from the literature? Is it falsifiable?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Is the study design appropriate for the research question?",
        questionType: "SCORE",
        subsection: "Study Design",
        helpText: "Consider: RCT, cohort, case-control, cross-sectional, etc. Is the design suited to the objectives?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Are the inclusion and exclusion criteria clearly defined and appropriate?",
        questionType: "SCORE",
        subsection: "Study Population",
        helpText: "Consider: Will criteria select the appropriate population? Are ethical considerations addressed?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Is the sample size calculation provided with appropriate justification?",
        questionType: "SCORE",
        subsection: "Sample Size",
        helpText: "Consider: Is power analysis provided? Are effect size assumptions reasonable?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Are primary and secondary outcome measures clearly defined?",
        questionType: "SCORE",
        subsection: "Outcome Measures",
        helpText: "Consider: Are outcomes specific and measurable? Is the timing of assessment appropriate?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Does the methodology adequately address Viddhakarma-specific considerations?",
        questionType: "SCORE",
        subsection: "Viddhakarma Specific",
        helpText: "Consider: Is the Ayurvedic framework integrated properly? Are classical texts referenced appropriately?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Please provide detailed comments on the methodology",
        questionType: "TEXT",
        helpText: "Include specific concerns, strengths, and suggestions for improvement.",
        placeholder: "Enter detailed methodology comments...",
        weight: 0,
        required: false,
      },
      {
        questionText: "How confident are you in your assessment of the methodology?",
        questionType: "CONFIDENCE_LEVEL",
        helpText: "Your confidence in evaluating methodology expertise",
        maxScore: 5,
        weight: 0,
        required: true,
        minValue: 1,
        maxValue: 5,
      },
    ],
  },
  {
    name: "Statistical Analysis",
    type: "STATISTICS",
    description: "Assessment of statistical methods and data analysis plan",
    helpText: "Evaluate the appropriateness and completeness of the statistical analysis plan.",
    weight: 5,
    maxScore: 100,
    questions: [
      {
        questionText: "Is the statistical analysis plan appropriate for the study design and objectives?",
        questionType: "SCORE",
        helpText: "Consider: Are tests chosen appropriate for data type and distribution?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Are the statistical methods described with sufficient detail?",
        questionType: "SCORE",
        helpText: "Consider: Can the analysis be replicated from the description?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Are software and significance levels clearly stated?",
        questionType: "CHECKBOX",
        helpText: "Verify that the statistical software and significance level are specified.",
        options: "Software specified\nSignificance level (α) stated\nBoth specified\nNeither specified",
        weight: 0,
        required: true,
      },
      {
        questionText: "Statistical Review Required",
        questionType: "SELECT",
        helpText: "Based on your assessment, determine if expert statistical review is needed.",
        options: "Adequate - No statistical review needed\nMinor issues - Consider statistical consultation\nNeeds Revision - Statistical review required\nMajor concerns - Expert statistical review mandatory",
        weight: 0,
        required: true,
      },
      {
        questionText: "Statistical analysis comments and concerns",
        questionType: "TEXT",
        helpText: "Provide specific concerns or suggestions for the statistical analysis plan.",
        placeholder: "Enter statistical analysis comments...",
        weight: 0,
        required: false,
      },
    ],
  },
  {
    name: "Ethics and Regulatory Compliance",
    type: "ETHICS",
    description: "Assessment of ethical considerations and regulatory compliance",
    helpText: "Evaluate ethical aspects including informed consent, IEC approval, and risk-benefit analysis.",
    weight: 5,
    maxScore: 100,
    questions: [
      {
        questionText: "Is the study ethically acceptable with appropriate risk-benefit assessment?",
        questionType: "SCORE",
        helpText: "Consider: Do potential benefits justify risks? Is the risk-minimization strategy adequate?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Is informed consent procedure adequately described?",
        questionType: "SCORE",
        helpText: "Consider: Is the process clear? Are vulnerable populations protected?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Does the proposal address IEC/Institutional Ethics Committee approval requirements?",
        questionType: "CHECKBOX",
        helpText: "Verify ethics committee considerations.",
        options: "IEC approval addressed\nCTRI registration planned\nAyush ministry guidelines considered\nIEC approval not addressed",
        weight: 0,
        required: true,
      },
      {
        questionText: "Is data privacy and confidentiality adequately addressed?",
        questionType: "SCORE",
        helpText: "Consider: Is data handling described? Are participant identities protected?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Ethics assessment",
        questionType: "SELECT",
        helpText: "Overall ethics assessment of the proposal.",
        options: "Fully acceptable - No major concerns\nAcceptable with minor modifications\nNeeds revision - Significant concerns\nNot acceptable - Major ethical issues",
        weight: 0,
        required: true,
      },
      {
        questionText: "Ethics comments and recommendations",
        questionType: "TEXT",
        helpText: "Provide specific concerns or recommendations for ethical compliance.",
        placeholder: "Enter ethics comments...",
        weight: 0,
        required: false,
      },
    ],
  },
  {
    name: "Investigator Qualification",
    type: "INVESTIGATOR",
    description: "Assessment of investigator experience and capability",
    helpText: "Evaluate whether the investigator team is qualified to conduct the proposed research.",
    weight: 15,
    maxScore: 100,
    questions: [
      {
        questionText: "Rate the investigator's experience in conducting clinical research",
        questionType: "SCORE",
        helpText: "Consider: Prior publications, completed studies, research training.",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Rate the investigator's knowledge of Viddhakarma procedures",
        questionType: "SCORE",
        helpText: "Consider: Clinical experience, training in Ayurvedic procedures, certifications.",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Rate the investigator's research capability and infrastructure availability",
        questionType: "SCORE",
        helpText: "Consider: Lab facilities, staff support, institutional resources.",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Rate the likelihood that the investigator can complete the study as proposed",
        questionType: "SCORE",
        helpText: "Consider: Time commitment, competing responsibilities, past performance.",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Investigator assessment",
        questionType: "SELECT",
        helpText: "Overall assessment of investigator qualifications.",
        options: "Highly qualified - Strong candidate\nAdequately qualified\nSome concerns about capability\nSignificant concerns - Not recommended",
        weight: 0,
        required: true,
      },
      {
        questionText: "Investigator assessment comments",
        questionType: "TEXT",
        helpText: "Provide specific observations about investigator qualifications.",
        placeholder: "Enter investigator comments...",
        weight: 0,
        required: false,
      },
    ],
  },
  {
    name: "Budget Assessment",
    type: "BUDGET",
    description: "Review and evaluation of the proposed budget",
    helpText: "Evaluate whether the budget is reasonable, justified, and adequate for the proposed research.",
    weight: 10,
    maxScore: 100,
    questions: [
      {
        questionText: "Is the total budget appropriate for the scope of the study?",
        questionType: "SCORE",
        helpText: "Consider: Does it match the study design and duration? Is it within funding limits?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Are individual budget items justified and reasonable?",
        questionType: "SCORE",
        helpText: "Consider: Are costs itemized appropriately? Are rates competitive?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Budget Review Assessment",
        questionType: "SELECT",
        helpText: "Overall budget assessment.",
        options: "Approved as proposed\nMinor adjustments recommended\nSignificant revision needed\nMajor concerns - Budget overhaul required",
        weight: 0,
        required: true,
      },
      {
        questionText: "Budget comments and recommended adjustments",
        questionType: "TEXT",
        helpText: "Provide specific comments and recommended budget modifications.",
        placeholder: "Enter budget comments...",
        weight: 0,
        required: false,
      },
    ],
  },
  {
    name: "Expected Outcomes and Impact",
    type: "EXPECTED_OUTCOMES",
    description: "Assessment of expected outcomes, clinical impact, and innovation",
    helpText: "Evaluate the potential impact and innovation of the proposed research.",
    weight: 15,
    maxScore: 100,
    questions: [
      {
        questionText: "Rate the potential clinical impact of the expected outcomes",
        questionType: "SCORE",
        helpText: "Consider: Will results improve patient care? Are outcomes clinically meaningful?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Rate the innovation level of the proposed research",
        questionType: "SCORE",
        helpText: "Consider: Does it introduce novel methods? Is it the first study in this area?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Rate the publication potential of the study",
        questionType: "SCORE",
        helpText: "Consider: Is the topic publishable? Are there plans for dissemination?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Rate the potential for future research directions",
        questionType: "SCORE",
        helpText: "Consider: Does this open new research avenues? Can it lead to larger studies?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Rate the contribution to standardization of Viddhakarma",
        questionType: "SCORE",
        helpText: "Consider: Will it help establish protocols? Does it support evidence-based practice?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        questionText: "Comments on expected outcomes and impact",
        questionType: "TEXT",
        helpText: "Provide specific observations about potential outcomes.",
        placeholder: "Enter outcome comments...",
        weight: 0,
        required: false,
      },
    ],
  },
  {
    name: "Final Recommendation",
    type: "FINAL_RECOMMENDATION",
    description: "Overall assessment and funding recommendation",
    helpText: "Provide your final recommendation for this proposal.",
    weight: 0,
    maxScore: 0,
    questions: [
      {
        questionText: "Overall Recommendation",
        questionType: "SELECT",
        helpText: "Your final recommendation for this proposal.",
        options: "Approve - Fund as proposed\nApprove with Minor Revision - Fund after addressing minor concerns\nMajor Revision - Resubmission required with significant changes\nReject - Does not meet funding criteria\nInterview Required - Further evaluation needed",
        weight: 0,
        required: true,
      },
      {
        questionText: "Interview Recommendation",
        questionType: "SELECT",
        helpText: "Should the applicant be called for an interview?",
        options: "No Interview Required\nInterview Recommended\nInterview Strongly Recommended\nInterview Mandatory",
        weight: 0,
        required: true,
      },
      {
        questionText: "Priority Ranking",
        questionType: "SELECT",
        helpText: "Relative priority compared to other proposals (if known).",
        options: "Top Priority - Must fund if possible\nHigh Priority\nMedium Priority\nLow Priority\nNot fundable at current level",
        weight: 0,
        required: true,
      },
      {
        questionText: "Summary of Major Strengths",
        questionType: "TEXT",
        helpText: "List the key strengths of this proposal.",
        placeholder: "Enter major strengths...",
        weight: 0,
        required: true,
      },
      {
        questionText: "Summary of Major Concerns",
        questionType: "TEXT",
        helpText: "List the key concerns that need to be addressed.",
        placeholder: "Enter major concerns...",
        weight: 0,
        required: true,
      },
      {
        questionText: "Comments for Committee",
        questionType: "TEXT",
        helpText: "Additional comments visible only to the committee.",
        placeholder: "Enter committee comments...",
        weight: 0,
        required: false,
      },
      {
        questionText: "Private Reviewer Notes",
        questionType: "TEXT",
        helpText: "Private notes only visible to you. Not shared with committee or applicants.",
        placeholder: "Enter private notes...",
        weight: 0,
        required: false,
      },
    ],
  },
];

async function seedQuestionnaire() {
  console.log("Seeding Review Questionnaire...\n");

  // Clear existing data
  console.log("Clearing existing questionnaire data...");
  await prisma.reviewResponse.deleteMany();
  await prisma.reviewQuestion.deleteMany();
  await prisma.reviewSection.deleteMany();

  // Insert sections and questions
  for (let i = 0; i < questionnaireData.length; i++) {
    const sectionData = questionnaireData[i];

    console.log(`Creating section ${i + 1}/${questionnaireData.length}: ${sectionData.name}`);

    const section = await prisma.reviewSection.create({
      data: {
        name: sectionData.name,
        type: sectionData.type,
        description: sectionData.description,
        helpText: sectionData.helpText,
        order: i,
        weight: sectionData.weight,
        maxScore: sectionData.maxScore,
        isRequired: true,
        isActive: true,
      },
    });

    // Create questions for this section
    for (let j = 0; j < sectionData.questions.length; j++) {
      const q = sectionData.questions[j];
      await prisma.reviewQuestion.create({
        data: {
          sectionId: section.id,
          questionText: q.questionText,
          questionType: q.questionType,
          helpText: q.helpText,
          placeholder: q.placeholder,
          maxScore: q.maxScore,
          weight: q.weight,
          required: q.required,
          options: q.options,
          minValue: q.minValue,
          maxValue: q.maxValue,
          subsection: q.subsection,
          order: j,
          isActive: true,
        },
      });
    }

    console.log(`  Created ${sectionData.questions.length} questions`);
  }

  console.log("\n✓ Questionnaire seeded successfully!");
  console.log(`  - ${questionnaireData.length} sections`);
  console.log(`  - ${questionnaireData.reduce((sum, s) => sum + s.questions.length, 0)} questions`);
}

seedQuestionnaire()
  .catch((error) => {
    console.error("Error seeding questionnaire:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
