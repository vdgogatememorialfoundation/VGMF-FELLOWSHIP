/**
 * VGMF Research Fellowship - Proposal Evaluation Questionnaire
 * 
 * This file contains the comprehensive evaluation questionnaire for
 * assessing Viddhakarma research proposals. The questionnaire is designed
 * to evaluate scientific validity, clinical relevance, feasibility,
 * methodology, ethics, statistical strength, budget, and contribution
 * to scientific acceptance of Viddhakarma.
 */

import type { ReviewSectionType, ReviewQuestionType } from "@prisma/client";

// Section weights for final score calculation
export const SECTION_WEIGHTS: Record<ReviewSectionType, number> = {
  SCIENTIFIC_VALIDITY: 25,   // 25%
  METHODOLOGY: 25,           // 25%
  INVESTIGATOR: 15,         // 15%
  EXPECTED_OUTCOMES: 15,     // 15%
  BUDGET: 10,               // 10%
  ETHICS: 5,                // 5%
  STATISTICS: 5,            // 5%
  CONTRIBUTION: 0,           // Informational (contributes to scientific validity)
  LITERATURE: 0,            // Informational (contributes to scientific validity)
  FINAL_RECOMMENDATION: 0,  // Final decision, not scored
};

export type QuestionnaireSection = {
  id: string;
  type: ReviewSectionType;
  name: string;
  description: string;
  helpText?: string;
  weight: number;
  maxScore: number;
  questions: QuestionnaireQuestion[];
};

export type QuestionnaireQuestion = {
  id: string;
  sectionId: string;
  questionText: string;
  questionType: ReviewQuestionType;
  helpText?: string;
  placeholder?: string;
  maxScore?: number;
  weight: number;
  required: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  subsection?: string;
};

// Main questionnaire structure
export const REVIEW_QUESTIONNAIRE: QuestionnaireSection[] = [
  // ============================================
  // SECTION 1: SCIENTIFIC VALIDITY AND RESEARCH QUESTION
  // ============================================
  {
    id: "section-scientific-validity",
    type: "SCIENTIFIC_VALIDITY",
    name: "Scientific Validity and Research Question",
    description: "Assessment of the scientific validity, clarity, and relevance of the proposed research question",
    helpText: "Evaluate whether the proposed research addresses an important unanswered question in Viddhakarma research.",
    weight: 25,
    maxScore: 100,
    questions: [
      {
        id: "q-sv-1",
        sectionId: "section-scientific-validity",
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
        id: "q-sv-2",
        sectionId: "section-scientific-validity",
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
        id: "q-sv-3",
        sectionId: "section-scientific-validity",
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
        id: "q-sv-4",
        sectionId: "section-scientific-validity",
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
        id: "q-sv-5",
        sectionId: "section-scientific-validity",
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
        id: "q-sv-6",
        sectionId: "section-scientific-validity",
        questionText: "Please provide detailed comments on the scientific validity of the proposal",
        questionType: "TEXT",
        helpText: "Include strengths, weaknesses, and specific concerns about the research question.",
        placeholder: "Enter your detailed assessment...",
        weight: 0,
        required: false,
      },
      {
        id: "q-sv-7",
        sectionId: "section-scientific-validity",
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

  // ============================================
  // SECTION 2: CONTRIBUTION TO SCIENTIFIC ACCEPTANCE
  // ============================================
  {
    id: "section-contribution",
    type: "CONTRIBUTION",
    name: "Contribution to Scientific Acceptance of Viddhakarma",
    description: "Assessment of the study's potential to contribute to scientific validation",
    helpText: "Evaluate how this study contributes to building scientific evidence for Viddhakarma.",
    weight: 0, // Informational
    maxScore: 100,
    questions: [
      {
        id: "q-contrib-1",
        sectionId: "section-contribution",
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
        id: "q-contrib-2",
        sectionId: "section-contribution",
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
        id: "q-contrib-3",
        sectionId: "section-contribution",
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
        id: "q-contrib-4",
        sectionId: "section-contribution",
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
        id: "q-contrib-5",
        sectionId: "section-contribution",
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
        id: "q-contrib-6",
        sectionId: "section-contribution",
        questionText: "Additional comments on contribution to scientific acceptance",
        questionType: "TEXT",
        helpText: "Any additional observations about the study's potential impact.",
        placeholder: "Enter additional comments...",
        weight: 0,
        required: false,
      },
    ],
  },

  // ============================================
  // SECTION 3: LITERATURE REVIEW
  // ============================================
  {
    id: "section-literature",
    type: "LITERATURE",
    name: "Literature Review",
    description: "Assessment of the literature review quality and comprehensiveness",
    helpText: "Evaluate whether the proposal demonstrates adequate understanding of existing research.",
    weight: 0, // Contributes to scientific validity
    maxScore: 100,
    questions: [
      {
        id: "q-lit-1",
        sectionId: "section-literature",
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
        id: "q-lit-2",
        sectionId: "section-literature",
        questionText: "Are there any significant missing references or key studies not cited?",
        questionType: "CHECKBOX",
        helpText: "Select if there are important studies that should have been cited.",
        options: ["No missing references", "Some relevant studies missing", "Major gaps in literature cited"],
        weight: 0,
        required: true,
      },
      {
        id: "q-lit-3",
        sectionId: "section-literature",
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
        id: "q-lit-4",
        sectionId: "section-literature",
        questionText: "Please list any missing key references or significant gaps in the literature review",
        questionType: "TEXT",
        helpText: "Provide specific suggestions for additional references if applicable.",
        placeholder: "Enter missing references or gaps...",
        weight: 0,
        required: false,
      },
    ],
  },

  // ============================================
  // SECTION 4: METHODOLOGY
  // ============================================
  {
    id: "section-methodology",
    type: "METHODOLOGY",
    name: "Methodology",
    description: "Comprehensive assessment of study design, methods, and technical approach",
    helpText: "This is the most critical section. Evaluate every aspect of the research methodology.",
    weight: 25,
    maxScore: 100,
    questions: [
      // 4.1 Objectives & Hypothesis
      {
        id: "q-meth-obj-1",
        sectionId: "section-methodology",
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
        id: "q-meth-obj-2",
        sectionId: "section-methodology",
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
        id: "q-meth-obj-3",
        sectionId: "section-methodology",
        questionText: "Are secondary objectives/aims appropriate and well-aligned with the primary objective?",
        questionType: "SCORE",
        subsection: "Objectives & Hypothesis",
        helpText: "Consider: Do secondary aims support the primary objective? Are they clearly prioritized?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      // 4.2 Study Design
      {
        id: "q-meth-design-1",
        sectionId: "section-methodology",
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
        id: "q-meth-design-2",
        sectionId: "section-methodology",
        questionText: "Does the proposal clearly describe the study design with appropriate justification?",
        questionType: "SCORE",
        subsection: "Study Design",
        helpText: "Consider: Is the rationale for design choice explained? Are alternatives considered?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        id: "q-meth-design-3",
        sectionId: "section-methodology",
        questionText: "For interventional studies: Is the intervention (Viddhakarma procedure) clearly described?",
        questionType: "SCORE",
        subsection: "Study Design",
        helpText: "Consider: Are procedure details adequate? Is there standardization of the intervention?",
        maxScore: 5,
        weight: 1,
        required: false, // Only for interventional studies
        minValue: 0,
        maxValue: 5,
      },
      // 4.3 Study Population
      {
        id: "q-meth-pop-1",
        sectionId: "section-methodology",
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
        id: "q-meth-pop-2",
        sectionId: "section-methodology",
        questionText: "Is the source of study population described with justification?",
        questionType: "SCORE",
        subsection: "Study Population",
        helpText: "Consider: Is the setting appropriate? Are referral patterns explained?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      // 4.4 Sample Size
      {
        id: "q-meth-sample-1",
        sectionId: "section-methodology",
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
        id: "q-meth-sample-2",
        sectionId: "section-methodology",
        questionText: "Is the proposed sample size achievable within the study timeframe and setting?",
        questionType: "SCORE",
        subsection: "Sample Size",
        helpText: "Consider: Is recruitment feasibility addressed? Are dropout rates accounted for?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      // 4.5 Control Group
      {
        id: "q-meth-control-1",
        sectionId: "section-methodology",
        questionText: "For comparative studies: Is the control group appropriate?",
        questionType: "SCORE",
        subsection: "Control Group",
        helpText: "Consider: Is the control appropriate (placebo, standard treatment, no treatment)?",
        maxScore: 5,
        weight: 1,
        required: false, // Only for comparative studies
        minValue: 0,
        maxValue: 5,
      },
      {
        id: "q-meth-control-2",
        sectionId: "section-methodology",
        questionText: "Are randomization and allocation concealment adequate?",
        questionType: "SCORE",
        subsection: "Control Group",
        helpText: "Consider: For RCTs - is randomization proper? Is allocation concealed?",
        maxScore: 5,
        weight: 1,
        required: false, // Only for RCTs
        minValue: 0,
        maxValue: 5,
      },
      // 4.6 Outcome Measures
      {
        id: "q-meth-outcome-1",
        sectionId: "section-methodology",
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
        id: "q-meth-outcome-2",
        sectionId: "section-methodology",
        questionText: "Are the outcome measures validated and appropriate for the study objectives?",
        questionType: "SCORE",
        subsection: "Outcome Measures",
        helpText: "Consider: Are standardized scales used? Are they validated in the target population?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      // 4.7 Blinding
      {
        id: "q-meth-blinding-1",
        sectionId: "section-methodology",
        questionText: "Is blinding (if applicable) adequately addressed?",
        questionType: "SCORE",
        subsection: "Blinding",
        helpText: "Consider: Who is blinded? Is blinding feasible for the intervention?",
        maxScore: 5,
        weight: 1,
        required: false,
        minValue: 0,
        maxValue: 5,
      },
      // 4.8 Data Collection
      {
        id: "q-meth-data-1",
        sectionId: "section-methodology",
        questionText: "Is the data collection procedure clearly described?",
        questionType: "SCORE",
        subsection: "Data Collection",
        helpText: "Consider: Are tools/instruments described? Is data collection standardized?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      // 4.9 Follow-up
      {
        id: "q-meth-followup-1",
        sectionId: "section-methodology",
        questionText: "For longitudinal studies: Is the follow-up schedule appropriate?",
        questionType: "SCORE",
        subsection: "Follow-up",
        helpText: "Consider: Is follow-up duration adequate? Is attrition addressed?",
        maxScore: 5,
        weight: 1,
        required: false, // Only for longitudinal studies
        minValue: 0,
        maxValue: 5,
      },
      // 4.10 Viddhakarma Specific
      {
        id: "q-meth-vk-1",
        sectionId: "section-methodology",
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
        id: "q-meth-vk-2",
        sectionId: "section-methodology",
        questionText: "Are the Viddhakarma procedures standardized for research purposes?",
        questionType: "SCORE",
        subsection: "Viddhakarma Specific",
        helpText: "Consider: Is there a manual/standard operating procedure? Can it be replicated?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      // Overall methodology comments
      {
        id: "q-meth-comments",
        sectionId: "section-methodology",
        questionText: "Please provide detailed comments on the methodology",
        questionType: "TEXT",
        helpText: "Include specific concerns, strengths, and suggestions for improvement.",
        placeholder: "Enter detailed methodology comments...",
        weight: 0,
        required: false,
      },
      {
        id: "q-meth-confidence",
        sectionId: "section-methodology",
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

  // ============================================
  // SECTION 5: STATISTICS
  // ============================================
  {
    id: "section-statistics",
    type: "STATISTICS",
    name: "Statistical Analysis",
    description: "Assessment of statistical methods and data analysis plan",
    helpText: "Evaluate the appropriateness and completeness of the statistical analysis plan.",
    weight: 5,
    maxScore: 100,
    questions: [
      {
        id: "q-stat-1",
        sectionId: "section-statistics",
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
        id: "q-stat-2",
        sectionId: "section-statistics",
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
        id: "q-stat-3",
        sectionId: "section-statistics",
        questionText: "Are software and significance levels clearly stated?",
        questionType: "CHECKBOX",
        helpText: "Verify that the statistical software and significance level are specified.",
        options: ["Software specified", "Significance level (α) stated", "Both specified", "Neither specified"],
        weight: 0,
        required: true,
      },
      {
        id: "q-stat-4",
        sectionId: "section-statistics",
        questionText: "Are methods for handling missing data and dropouts addressed?",
        questionType: "SCORE",
        helpText: "Consider: Is there a plan for ITT analysis? Are imputation methods appropriate?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        id: "q-stat-5",
        sectionId: "section-statistics",
        questionText: "Statistical Review Required",
        questionType: "SELECT",
        helpText: "Based on your assessment, determine if expert statistical review is needed.",
        options: [
          "Adequate - No statistical review needed",
          "Minor issues - Consider statistical consultation",
          "Needs Revision - Statistical review required",
          "Major concerns - Expert statistical review mandatory"
        ],
        weight: 0,
        required: true,
      },
      {
        id: "q-stat-comments",
        sectionId: "section-statistics",
        questionText: "Statistical analysis comments and concerns",
        questionType: "TEXT",
        helpText: "Provide specific concerns or suggestions for the statistical analysis plan.",
        placeholder: "Enter statistical analysis comments...",
        weight: 0,
        required: false,
      },
    ],
  },

  // ============================================
  // SECTION 6: ETHICS
  // ============================================
  {
    id: "section-ethics",
    type: "ETHICS",
    name: "Ethics and Regulatory Compliance",
    description: "Assessment of ethical considerations and regulatory compliance",
    helpText: "Evaluate ethical aspects including informed consent, IEC approval, and risk-benefit analysis.",
    weight: 5,
    maxScore: 100,
    questions: [
      {
        id: "q-eth-1",
        sectionId: "section-ethics",
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
        id: "q-eth-2",
        sectionId: "section-ethics",
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
        id: "q-eth-3",
        sectionId: "section-ethics",
        questionText: "Does the proposal address IEC/Institutional Ethics Committee approval requirements?",
        questionType: "CHECKBOX",
        helpText: "Verify ethics committee considerations.",
        options: [
          "IEC approval addressed",
          "CTRI registration planned",
          "Ayush ministry guidelines considered",
          "IEC approval not addressed"
        ],
        weight: 0,
        required: true,
      },
      {
        id: "q-eth-4",
        sectionId: "section-ethics",
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
        id: "q-eth-5",
        sectionId: "section-ethics",
        questionText: "Are conflict of interest disclosures appropriate?",
        questionType: "SCORE",
        helpText: "Consider: Are investigator conflicts disclosed? Is funding source identified?",
        maxScore: 5,
        weight: 1,
        required: true,
        minValue: 0,
        maxValue: 5,
      },
      {
        id: "q-eth-6",
        sectionId: "section-ethics",
        questionText: "Does the study consider special populations appropriately (if applicable)?",
        questionType: "SCORE",
        helpText: "Consider: Are children, pregnant women, or vulnerable populations addressed?",
        maxScore: 5,
        weight: 1,
        required: false,
        minValue: 0,
        maxValue: 5,
      },
      {
        id: "q-eth-7",
        sectionId: "section-ethics",
        questionText: "Ethics assessment",
        questionType: "SELECT",
        helpText: "Overall ethics assessment of the proposal.",
        options: [
          "Fully acceptable - No major concerns",
          "Acceptable with minor modifications",
          "Needs revision - Significant concerns",
          "Not acceptable - Major ethical issues"
        ],
        weight: 0,
        required: true,
      },
      {
        id: "q-eth-comments",
        sectionId: "section-ethics",
        questionText: "Ethics comments and recommendations",
        questionType: "TEXT",
        helpText: "Provide specific concerns or recommendations for ethical compliance.",
        placeholder: "Enter ethics comments...",
        weight: 0,
        required: false,
      },
    ],
  },

  // ============================================
  // SECTION 7: INVESTIGATOR
  // ============================================
  {
    id: "section-investigator",
    type: "INVESTIGATOR",
    name: "Investigator Qualification",
    description: "Assessment of investigator experience and capability",
    helpText: "Evaluate whether the investigator team is qualified to conduct the proposed research.",
    weight: 15,
    maxScore: 100,
    questions: [
      {
        id: "q-inv-1",
        sectionId: "section-investigator",
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
        id: "q-inv-2",
        sectionId: "section-investigator",
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
        id: "q-inv-3",
        sectionId: "section-investigator",
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
        id: "q-inv-4",
        sectionId: "section-investigator",
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
        id: "q-inv-5",
        sectionId: "section-investigator",
        questionText: "Investigator assessment",
        questionType: "SELECT",
        helpText: "Overall assessment of investigator qualifications.",
        options: [
          "Highly qualified - Strong candidate",
          "Adequately qualified",
          "Some concerns about capability",
          "Significant concerns - Not recommended"
        ],
        weight: 0,
        required: true,
      },
      {
        id: "q-inv-comments",
        sectionId: "section-investigator",
        questionText: "Investigator assessment comments",
        questionType: "TEXT",
        helpText: "Provide specific observations about investigator qualifications.",
        placeholder: "Enter investigator comments...",
        weight: 0,
        required: false,
      },
    ],
  },

  // ============================================
  // SECTION 8: BUDGET
  // ============================================
  {
    id: "section-budget",
    type: "BUDGET",
    name: "Budget Assessment",
    description: "Review and evaluation of the proposed budget",
    helpText: "Evaluate whether the budget is reasonable, justified, and adequate for the proposed research.",
    weight: 10,
    maxScore: 100,
    questions: [
      {
        id: "q-budget-1",
        sectionId: "section-budget",
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
        id: "q-budget-2",
        sectionId: "section-budget",
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
        id: "q-budget-3",
        sectionId: "section-budget",
        questionText: "Budget Review Assessment",
        questionType: "SELECT",
        helpText: "Overall budget assessment.",
        options: [
          "Approved as proposed",
          "Minor adjustments recommended",
          "Significant revision needed",
          "Major concerns - Budget overhaul required"
        ],
        weight: 0,
        required: true,
      },
      {
        id: "q-budget-4",
        sectionId: "section-budget",
        questionText: "Personnel costs appropriate?",
        questionType: "CHECKBOX",
        helpText: "Evaluate personnel budget.",
        options: ["Appropriate", "Too high", "Too low", "Not clearly justified", "Not applicable"],
        weight: 0,
        required: true,
      },
      {
        id: "q-budget-5",
        sectionId: "section-budget",
        questionText: "Equipment costs appropriate?",
        questionType: "CHECKBOX",
        helpText: "Evaluate equipment budget.",
        options: ["Appropriate", "Too high", "Too low", "Not clearly justified", "Not applicable"],
        weight: 0,
        required: true,
      },
      {
        id: "q-budget-6",
        sectionId: "section-budget",
        questionText: "Consumables and supplies appropriate?",
        questionType: "CHECKBOX",
        helpText: "Evaluate consumables budget.",
        options: ["Appropriate", "Too high", "Too low", "Not clearly justified", "Not applicable"],
        weight: 0,
        required: true,
      },
      {
        id: "q-budget-comments",
        sectionId: "section-budget",
        questionText: "Budget comments and recommended adjustments",
        questionType: "TEXT",
        helpText: "Provide specific comments and recommended budget modifications.",
        placeholder: "Enter budget comments...",
        weight: 0,
        required: false,
      },
      // Budget Table (editable)
      {
        id: "q-budget-table",
        sectionId: "section-budget",
        questionText: "Budget Recommendation Table",
        questionType: "TABLE",
        helpText: "Provide recommended amounts for each budget head.",
        weight: 0,
        required: false,
        options: JSON.stringify([
          { head: "Equipment", requested: 0, recommended: 0, remarks: "" },
          { head: "Consumables", requested: 0, recommended: 0, remarks: "" },
          { head: "Diagnostics", requested: 0, recommended: 0, remarks: "" },
          { head: "Publication", requested: 0, recommended: 0, remarks: "" },
          { head: "Travel", requested: 0, recommended: 0, remarks: "" },
          { head: "Documentation", requested: 0, recommended: 0, remarks: "" },
          { head: "Other", requested: 0, recommended: 0, remarks: "" },
          { head: "TOTAL", requested: 0, recommended: 0, remarks: "" },
        ]),
      },
    ],
  },

  // ============================================
  // SECTION 9: EXPECTED OUTCOMES
  // ============================================
  {
    id: "section-outcomes",
    type: "EXPECTED_OUTCOMES",
    name: "Expected Outcomes and Impact",
    description: "Assessment of expected outcomes, clinical impact, and innovation",
    helpText: "Evaluate the potential impact and innovation of the proposed research.",
    weight: 15,
    maxScore: 100,
    questions: [
      {
        id: "q-outcome-1",
        sectionId: "section-outcomes",
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
        id: "q-outcome-2",
        sectionId: "section-outcomes",
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
        id: "q-outcome-3",
        sectionId: "section-outcomes",
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
        id: "q-outcome-4",
        sectionId: "section-outcomes",
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
        id: "q-outcome-5",
        sectionId: "section-outcomes",
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
        id: "q-outcome-comments",
        sectionId: "section-outcomes",
        questionText: "Comments on expected outcomes and impact",
        questionType: "TEXT",
        helpText: "Provide specific observations about potential outcomes.",
        placeholder: "Enter outcome comments...",
        weight: 0,
        required: false,
      },
    ],
  },

  // ============================================
  // SECTION 10: FINAL RECOMMENDATION
  // ============================================
  {
    id: "section-recommendation",
    type: "FINAL_RECOMMENDATION",
    name: "Final Recommendation",
    description: "Overall assessment and funding recommendation",
    helpText: "Provide your final recommendation for this proposal.",
    weight: 0, // Not scored
    maxScore: 0,
    questions: [
      {
        id: "q-rec-1",
        sectionId: "section-recommendation",
        questionText: "Overall Recommendation",
        questionType: "SELECT",
        helpText: "Your final recommendation for this proposal.",
        options: [
          "Approve - Fund as proposed",
          "Approve with Minor Revision - Fund after addressing minor concerns",
          "Major Revision - Resubmission required with significant changes",
          "Reject - Does not meet funding criteria",
          "Interview Required - Further evaluation needed"
        ],
        weight: 0,
        required: true,
      },
      {
        id: "q-rec-2",
        sectionId: "section-recommendation",
        questionText: "Interview Recommendation",
        questionType: "SELECT",
        helpText: "Should the applicant be called for an interview?",
        options: [
          "No Interview Required",
          "Interview Recommended",
          "Interview Strongly Recommended",
          "Interview Mandatory"
        ],
        weight: 0,
        required: true,
      },
      {
        id: "q-rec-3",
        sectionId: "section-recommendation",
        questionText: "Priority Ranking",
        questionType: "SELECT",
        helpText: "Relative priority compared to other proposals (if known).",
        options: [
          "Top Priority - Must fund if possible",
          "High Priority",
          "Medium Priority",
          "Low Priority",
          "Not fundable at current level"
        ],
        weight: 0,
        required: true,
      },
      {
        id: "q-rec-4",
        sectionId: "section-recommendation",
        questionText: "Summary of Major Strengths",
        questionType: "TEXT",
        helpText: "List the key strengths of this proposal.",
        placeholder: "Enter major strengths...",
        weight: 0,
        required: true,
      },
      {
        id: "q-rec-5",
        sectionId: "section-recommendation",
        questionText: "Summary of Major Concerns",
        questionType: "TEXT",
        helpText: "List the key concerns that need to be addressed.",
        placeholder: "Enter major concerns...",
        weight: 0,
        required: true,
      },
      {
        id: "q-rec-6",
        sectionId: "section-recommendation",
        questionText: "Comments for Committee",
        questionType: "TEXT",
        helpText: "Additional comments visible only to the committee.",
        placeholder: "Enter committee comments...",
        weight: 0,
        required: false,
      },
      {
        id: "q-rec-7",
        sectionId: "section-recommendation",
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

// Helper functions
export function getQuestionnaireSections(): QuestionnaireSection[] {
  return REVIEW_QUESTIONNAIRE;
}

export function getSectionById(sectionId: string): QuestionnaireSection | undefined {
  return REVIEW_QUESTIONNAIRE.find(s => s.id === sectionId);
}

export function getSectionByType(type: ReviewSectionType): QuestionnaireSection | undefined {
  return REVIEW_QUESTIONNAIRE.find(s => s.type === type);
}

export function getQuestionById(questionId: string): { question: QuestionnaireQuestion; section: QuestionnaireSection } | undefined {
  for (const section of REVIEW_QUESTIONNAIRE) {
    const question = section.questions.find(q => q.id === questionId);
    if (question) {
      return { question, section };
    }
  }
  return undefined;
}

export function getTotalQuestions(): number {
  return REVIEW_QUESTIONNAIRE.reduce((acc, section) => acc + section.questions.length, 0);
}

export function getScoredQuestions(): number {
  return REVIEW_QUESTIONNAIRE.reduce((acc, section) => {
    return acc + section.questions.filter(q => q.questionType === "SCORE").length;
  }, 0);
}

export function getMaxPossibleScore(): number {
  return REVIEW_QUESTIONNAIRE.reduce((acc, section) => {
    const sectionScore = section.questions
      .filter(q => q.questionType === "SCORE")
      .reduce((qAcc, q) => qAcc + (q.maxScore || 5) * q.weight, 0);
    return acc + sectionScore * (section.weight / 100);
  }, 0);
}

// Calculate weighted score
export function calculateWeightedScore(
  responses: Record<string, { score?: number; booleanValue?: boolean }>
): { sectionScores: Record<string, number>; totalScore: number; maxScore: number } {
  const sectionScores: Record<string, number> = {};
  let totalScore = 0;
  let maxScore = 0;

  for (const section of REVIEW_QUESTIONNAIRE) {
    let sectionScore = 0;
    let sectionMaxScore = 0;

    for (const question of section.questions) {
      if (question.questionType === "SCORE") {
        const response = responses[question.id];
        const score = response?.score ?? 0;
        const maxQScore = question.maxScore || 5;
        sectionScore += score * question.weight;
        sectionMaxScore += maxQScore * question.weight;
      } else if (question.questionType === "CHECKBOX") {
        const response = responses[question.id];
        if (response?.booleanValue) {
          sectionScore += (question.maxScore || 5) * question.weight;
        }
        sectionMaxScore += (question.maxScore || 5) * question.weight;
      }
    }

    const weightedSectionScore = sectionScore * (section.weight / 100);
    const weightedMaxScore = sectionMaxScore * (section.weight / 100);
    
    sectionScores[section.type] = weightedSectionScore;
    totalScore += weightedSectionScore;
    maxScore += weightedMaxScore;
  }

  return { sectionScores, totalScore, maxScore };
}
