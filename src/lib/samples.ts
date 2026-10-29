import { LABELS_EN } from "./labels";
import type { Analysis } from "./schema";

export interface Sample {
  id: string;
  name: string;
  blurb: string;
  image: string;
  /** Saved English explanation, shown when the server has no API key. */
  analysis: Analysis;
}

const hospitalBill: Analysis = {
  readable: true,
  unreadableReason: null,
  title: "Hospital bill from Brightwater Community Hospital",
  documentType: "Medical bill (patient statement)",
  sender: "Brightwater Community Hospital, Patient Financial Services",
  originalLanguage: "English",
  urgency: "act_soon",
  urgencyReason: "You owe $1,284.50 and the hospital asks you to pay or call by November 19, 2026.",
  summary:
    "This is a bill for your emergency room visit on September 14, 2026. Your insurance already paid part of it. The $1,284.50 left is your share: your deductible and coinsurance. If you can't pay it all, you can ask for a free monthly payment plan or apply for financial help that could lower or cancel the bill.",
  actions: [
    {
      step: "Check the bill for mistakes",
      how: "Ask for an itemized bill and compare it with your insurance's Explanation of Benefits. Call (555) 014-2290 if anything looks wrong.",
      deadline: "2026-11-19",
      deadlineText: "within 30 days of this statement (statement dated October 20, 2026)",
      sourceQuote:
        "If you believe there is an error, please call us within 30 days of this statement.",
    },
    {
      step: "If money is tight, ask about financial assistance",
      how: "Call Patient Financial Services at (555) 014-2290, Monday–Friday, 8:00 a.m.–5:00 p.m. It can reduce or erase the bill based on your household income.",
      deadline: null,
      deadlineText: "Up to 240 days after your first bill",
      sourceQuote: "Applications are accepted up to 240 days after your first bill.",
    },
    {
      step: "Pay $1,284.50, or set up a payment plan",
      how: "Pay online at brightwater-pay.example, by phone at (555) 014-2290, or mail a check with the coupon to PO Box 4410, Brightwater. For a plan with no interest, call before the due date.",
      deadline: "2026-11-19",
      deadlineText: "Please pay by November 19, 2026",
      sourceQuote: "Please pay by: November 19, 2026",
    },
  ],
  fields: [
    {
      label: "Amount enclosed: $",
      meaning: "How much money you are sending with the payment coupon.",
      whatToWrite:
        "The amount of your check. It can be the full $1,284.50 or a plan payment you agreed with the hospital.",
      whereToFind: "The amount on the check you are mailing.",
      example: "1,284.50",
      required: "required",
      alreadyFilled: false,
    },
  ],
  money: [
    {
      amount: "$1,284.50",
      meaning: "What you owe after insurance",
      dueDate: "2026-11-19",
      sourceQuote: "PATIENT RESPONSIBILITY (deductible and coinsurance) $1,284.50",
    },
    {
      amount: "$3,852.00",
      meaning: "The full price of the visit before insurance",
      dueDate: null,
      sourceQuote: "Total charges $3,852.00",
    },
    {
      amount: "$2,107.50",
      meaning: "What your insurance, Sunrise Health Plan, already paid",
      dueDate: null,
      sourceQuote: "Payment from Sunrise Health Plan -$2,107.50",
    },
    {
      amount: "$460.00",
      meaning:
        "A discount because the hospital is in your insurance network. You don't pay this part.",
      dueDate: null,
      sourceQuote: "Contractual adjustment (network discount) -$460.00",
    },
  ],
  dates: [
    {
      date: "2026-09-14",
      dateText: "09/14/2026",
      label: "Your emergency room visit",
      sourceQuote: "09/14/2026 Emergency department visit, level 4",
    },
    {
      date: "2026-10-20",
      dateText: "October 20, 2026",
      label: "Date of this bill",
      sourceQuote: "Statement date: October 20, 2026",
    },
    {
      date: "2026-11-19",
      dateText: "November 19, 2026",
      label: "Payment due, and last day to report a billing error",
      sourceQuote: "Please pay by: November 19, 2026",
    },
  ],
  warnings: [
    {
      kind: "penalty",
      text: "If you don't pay or set up a payment plan within 90 days of the first bill, the hospital may send your account to a collection agency.",
      sourceQuote:
        "Accounts with no payment or payment arrangement within 90 days of the first statement may be referred to an outside collection agency.",
    },
    {
      kind: "your_right",
      text: "You can ask for a detailed, line-by-line bill at any time.",
      sourceQuote: "You have the right to request an itemized bill at any time.",
    },
    {
      kind: "your_right",
      text: "A free interpreter is available if you'd like to talk to them in another language. Call (555) 014-2291.",
      sourceQuote: "Free language assistance and interpreter services are available.",
    },
    {
      kind: "tip",
      text: "Before paying, check that the amount matches the Explanation of Benefits from your insurance. Keep a copy of the bill and any receipts.",
      sourceQuote: null,
    },
  ],
  glossary: [
    {
      term: "Deductible",
      plain: "The amount you pay each year before your insurance starts paying.",
    },
    {
      term: "Coinsurance",
      plain: "Your share, as a percentage, of a bill after the deductible is met.",
    },
    {
      term: "Contractual adjustment",
      plain: "A discount the hospital agreed with your insurance. You don't owe it.",
    },
    { term: "Guarantor", plain: "The person responsible for paying the bill." },
    { term: "Itemized bill", plain: "A bill that lists every single service and its price." },
  ],
  contacts: [
    {
      name: "Patient Financial Services",
      purpose: "Payments, payment plans, financial assistance, and billing errors",
      phone: "(555) 014-2290",
      email: null,
      address: "1200 Harbor View Road, Brightwater",
      hours: "Monday–Friday, 8:00 a.m.–5:00 p.m.",
    },
    {
      name: "Language assistance line",
      purpose: "Free interpreter",
      phone: "(555) 014-2291",
      email: null,
      address: null,
      hours: null,
    },
  ],
  questionsToAsk: [
    "Can you send me an itemized bill?",
    "Do I qualify for financial assistance, and how do I apply?",
    "What is the smallest monthly payment you can accept, with no interest?",
    "Has my insurance finished processing this visit?",
  ],
  followUps: [
    "What happens if I can't pay by November 19?",
    "How does financial assistance work?",
    "Why do I owe money if I have insurance?",
  ],
  labels: { ...LABELS_EN },
};

const schoolMeals: Analysis = {
  readable: true,
  unreadableReason: null,
  title: "School meals application, Cedar Hollow Unified School District",
  documentType: "Application form for free or reduced-price school meals",
  sender: "Cedar Hollow Unified School District, Nutrition Services",
  originalLanguage: "English",
  urgency: "act_soon",
  urgencyReason:
    "Return it by November 20, 2026, or your child will be charged full price for meals.",
  summary:
    "This form asks if your family can get free or cheaper school meals. You fill it in once for everyone in your home. If someone in your home gets SNAP, TANF, or FDPIR, you don't need to report income. One child is already filled in. The school will tell you the result within 10 working days.",
  actions: [
    {
      step: "Add any other children or students in your home to Step 1",
      how: "Include babies and students up to grade 12. Tick the boxes if a child is in foster care, homeless, migrant, or a runaway.",
      deadline: null,
      deadlineText: null,
      sourceQuote:
        "List ALL household members who are infants, children, and students up to and including grade 12",
    },
    {
      step: "Answer Step 2: does anyone in your home get SNAP, TANF, or FDPIR?",
      how: "If yes, write one case number and skip to Step 4. If no, go to Step 3.",
      deadline: null,
      deadlineText: null,
      sourceQuote: "YES → write a case number here, then go to STEP 4 (do not complete STEP 3)",
    },
    {
      step: "If you answered no, report everyone's income in Step 3",
      how: "Write income before taxes, in whole dollars, and how often it is paid. List every adult, even those with no income.",
      deadline: null,
      deadlineText: null,
      sourceQuote: "Report gross income (before taxes) in whole dollars.",
    },
    {
      step: "Fill in your address, then sign and date Step 4",
      how: "An adult in the home must sign. Phone and email are optional.",
      deadline: null,
      deadlineText: null,
      sourceQuote: "Contact information and adult signature",
    },
    {
      step: "Return the form",
      how: "Hand it in at any school office, or mail it to Nutrition Services, 400 Orchard Lane, Cedar Hollow. Keep a photo of it.",
      deadline: "2026-11-20",
      deadlineText: "Return by November 20, 2026",
      sourceQuote: "Return by November 20, 2026.",
    },
  ],
  fields: [
    {
      label: "Child's first name / MI / Child's last name / School / Grade",
      meaning: "Each child or student in your home, up to grade 12.",
      whatToWrite:
        "Their name, middle initial, school, and grade. The first row is already filled in; add any other children on the empty rows.",
      whereToFind: "Your children's school papers or report cards.",
      example: "Ana · L · Osei · Cedar Hollow Middle · 7",
      required: "required",
      alreadyFilled: true,
    },
    {
      label: "Foster child",
      meaning: "Is this child placed with you by a foster care agency or court?",
      whatToWrite: "Tick the box only if yes.",
      whereToFind: null,
      example: null,
      required: "optional",
      alreadyFilled: false,
    },
    {
      label: "Homeless, migrant, runaway",
      meaning:
        "Does this child have no fixed home, move for farm or fishing work, or live away from their family by choice?",
      whatToWrite: "Tick the box only if yes. These children usually qualify automatically.",
      whereToFind: null,
      example: null,
      required: "optional",
      alreadyFilled: false,
    },
    {
      label: "SNAP, TANF, or FDPIR case number",
      meaning:
        "Food or cash benefits from the government. If you get them, you can skip the income section.",
      whatToWrite:
        "One case number, if anyone in your home gets these benefits. Otherwise tick NO.",
      whereToFind:
        "Your benefits approval letter or EBT paperwork. It's the case number, not the card number.",
      example: "4400123",
      required: "required",
      alreadyFilled: false,
    },
    {
      label: "Child income $ / How often?",
      meaning: "Money the children themselves receive, like a part-time job or Social Security.",
      whatToWrite: "The total for all children, and tick how often it comes. Write 0 if none.",
      whereToFind: "Pay stubs or benefit letters for the children.",
      example: "120, Monthly",
      required: "required",
      alreadyFilled: false,
    },
    {
      label: "Name of adult household member (first and last)",
      meaning: "Every adult who lives with you and shares money for living costs, including you.",
      whatToWrite: "Each adult's full name, one per row, even if they have no income.",
      whereToFind: null,
      example: "Kwame Osei",
      required: "required",
      alreadyFilled: false,
    },
    {
      label: "Earnings from work / How often?",
      meaning: "Pay from jobs before taxes are taken out.",
      whatToWrite:
        "Each adult's gross pay in whole dollars and how often they're paid (weekly, every two weeks, twice a month, or monthly).",
      whereToFind: 'The "gross pay" line on a recent pay stub.',
      example: "1,150, Bi-weekly",
      required: "required",
      alreadyFilled: false,
    },
    {
      label: "Public assistance / child support / alimony",
      meaning: "Cash benefits, child support, or spousal support each adult receives.",
      whatToWrite: "The amount and how often. Leave blank or write 0 if none.",
      whereToFind: "Benefit letters or court orders.",
      example: "300, Monthly",
      required: "required",
      alreadyFilled: false,
    },
    {
      label: "Pensions / retirement / all other income",
      meaning: "Any other money: pensions, Social Security, unemployment, rental income.",
      whatToWrite: "The amount and how often. Write 0 if none.",
      whereToFind: "Benefit statements or bank deposits.",
      example: "0",
      required: "required",
      alreadyFilled: false,
    },
    {
      label: "Total household members (children and adults)",
      meaning: "How many people live in your home and share money, including you.",
      whatToWrite: "A single number.",
      whereToFind: null,
      example: "4",
      required: "required",
      alreadyFilled: false,
    },
    {
      label: "Last four digits of Social Security Number (SSN)",
      meaning: "Only the last 4 digits of one adult's Social Security number.",
      whatToWrite: 'The last 4 digits, or tick "Check if no SSN". You can still apply without one.',
      whereToFind: "Your Social Security card.",
      example: "1234",
      required: "required",
      alreadyFilled: false,
    },
    {
      label: "Street address / Apt # / City / ZIP",
      meaning: "Where you live.",
      whatToWrite:
        'Your home address. The form says "if available", so you can leave it blank if you don\'t have one.',
      whereToFind: null,
      example: "12 Pine Street, Apt 3, Cedar Hollow, 90000",
      required: "optional",
      alreadyFilled: false,
    },
    {
      label: "Daytime phone and email (optional)",
      meaning: "How the school can reach you.",
      whatToWrite: "A phone number or email, if you want to share one.",
      whereToFind: null,
      example: null,
      required: "optional",
      alreadyFilled: false,
    },
    {
      label: "Printed name of adult completing the form / Signature of adult / Today's date",
      meaning: "Your promise that the answers are true.",
      whatToWrite: "Your name in capital letters, your signature, and the date you sign.",
      whereToFind: null,
      example: null,
      required: "required",
      alreadyFilled: false,
    },
    {
      label: "Children's racial and ethnic identities",
      meaning: "A question for statistics.",
      whatToWrite: "Optional. Your answer doesn't change whether you qualify.",
      whereToFind: null,
      example: null,
      required: "optional",
      alreadyFilled: false,
    },
  ],
  money: [
    {
      amount: "$3.25",
      meaning: "Full price for lunch without an approved application",
      dueDate: null,
      sourceQuote: "$3.25 lunch",
    },
    {
      amount: "$2.10",
      meaning: "Full price for breakfast without an approved application",
      dueDate: null,
      sourceQuote: "$2.10 breakfast",
    },
  ],
  dates: [
    {
      date: "2026-11-20",
      dateText: "November 20, 2026",
      label: "Last day to return the form",
      sourceQuote: "Return by November 20, 2026.",
    },
  ],
  warnings: [
    {
      kind: "deadline",
      text: "If the school doesn't have an approved form after November 20, 2026, your children will pay full price for meals.",
      sourceQuote:
        "Students without an approved application on file after this date will be charged full price for meals",
    },
    {
      kind: "penalty",
      text: "Giving false information on purpose can mean losing meal benefits and legal trouble. Make sure the income is correct.",
      sourceQuote: "if I purposely give false information, my children may lose meal benefits",
    },
    {
      kind: "tip",
      text: "Use a pen, and fill in one form for the whole household, not one per child.",
      sourceQuote: "Apply once per household. Use a pen.",
    },
    {
      kind: "tip",
      text: "Take a photo of the finished form before you hand it in.",
      sourceQuote: null,
    },
  ],
  glossary: [
    {
      term: "Household member",
      plain: "Anyone who lives with you and shares income and expenses, related or not.",
    },
    { term: "SNAP", plain: "Food benefits (sometimes called food stamps or EBT)." },
    { term: "TANF", plain: "Cash help for families with children." },
    { term: "FDPIR", plain: "A food program for households on Indian reservations." },
    {
      term: "Gross income",
      plain: "Money earned before taxes and other deductions are taken out.",
    },
    { term: "Bi-weekly", plain: "Every two weeks." },
  ],
  contacts: [
    {
      name: "Cedar Hollow USD Nutrition Services",
      purpose: "Questions about the form, or to mail it",
      phone: "(555) 013-8800",
      email: null,
      address: "400 Orchard Lane, Cedar Hollow",
      hours: "Monday–Friday, 7:30 a.m.–4:00 p.m.",
    },
  ],
  questionsToAsk: [
    "Is this form available in my language?",
    "Who counts as a household member if we share a home with relatives?",
    "Can my children keep getting meals while the form is being checked?",
  ],
  followUps: [
    "Do I have to report income if I get SNAP?",
    "What if I don't have a Social Security number?",
    "Who counts as a household member?",
  ],
  labels: { ...LABELS_EN },
};

const taxScam: Analysis = {
  readable: true,
  unreadableReason: null,
  title: "Letter demanding tax payment in gift cards",
  documentType: "Demand letter claiming unpaid taxes (shows strong signs of a scam)",
  sender: 'Claims to be the "Federal Tax Resolution Department"',
  originalLanguage: "English",
  urgency: "act_now",
  urgencyReason: "This letter looks like a scam. Don't pay or call the number on it.",
  summary:
    "This letter says you owe $4,962.18 in taxes and will be arrested within 24 hours unless you pay with gift cards. Real tax offices do not ask for gift cards and do not threaten arrest like this. This is very likely a scam. Don't send money, card numbers, or personal details. If you're worried, contact the tax office yourself using a phone number from its official website.",
  actions: [
    {
      step: "Don't buy gift cards or call the number in the letter",
      how: "Gift card payments can't be undone. Scammers use the card numbers and PINs right away.",
      deadline: null,
      deadlineText: null,
      sourceQuote: "purchase prepaid gift cards from any store in the full amount owed",
    },
    {
      step: "Check whether you really owe taxes",
      how: "Look up the official tax agency's phone number or website yourself, not from this letter, and ask about your account.",
      deadline: null,
      deadlineText: null,
      sourceQuote: null,
    },
    {
      step: "Talk to someone you trust",
      how: "The letter tells you to keep it secret, which is a common scam trick. Show it to family, your bank, or a local community center.",
      deadline: null,
      deadlineText: null,
      sourceQuote: "Do not discuss this matter with anyone, including your bank or family members",
    },
    {
      step: "Report the letter",
      how: "Report it to your country's consumer protection or fraud reporting service. Keep the letter as evidence.",
      deadline: null,
      deadlineText: null,
      sourceQuote: null,
    },
  ],
  fields: [],
  money: [
    {
      amount: "$4,962.18",
      meaning:
        "The amount the letter demands. Don't pay it before checking with the real tax office.",
      dueDate: null,
      sourceQuote: "you owe $4,962.18 in unpaid federal taxes and penalties for tax year 2024",
    },
  ],
  dates: [
    {
      date: "2026-10-27",
      dateText: "October 27, 2026",
      label: "Date printed on the letter",
      sourceQuote: "Notice date: October 27, 2026",
    },
  ],
  warnings: [
    {
      kind: "scam_sign",
      text: "It asks for payment with gift cards. Government agencies never ask for this.",
      sourceQuote: "purchase prepaid gift cards from any store in the full amount owed",
    },
    {
      kind: "scam_sign",
      text: "It threatens arrest within 24 hours. Real tax offices send several letters and give you time and a way to appeal.",
      sourceQuote: "A warrant for your arrest will be issued and your bank accounts frozen",
    },
    {
      kind: "scam_sign",
      text: "It tells you not to talk to anyone, including your bank or family.",
      sourceQuote: "Do not discuss this matter with anyone, including your bank or family members",
    },
    {
      kind: "scam_sign",
      text: "It asks you to reply to a free email address and says the office is open 24/7. Government offices use official addresses.",
      sourceQuote: "Reply only to taxresolution.dept@freemail.example",
    },
    {
      kind: "scam_sign",
      text: "It asks for gift card numbers and PINs by phone, which lets someone spend the money instantly.",
      sourceQuote: "call our Resolution Officer at (555) 019-4477 with the card numbers and PINs",
    },
    {
      kind: "tip",
      text: "If you already sent gift card numbers, contact the company that issued the cards right away. Sometimes they can freeze the money.",
      sourceQuote: null,
    },
  ],
  glossary: [
    { term: "Tax liability", plain: "Money someone says you owe in taxes." },
    { term: "Warrant", plain: "A court order. Courts, not tax letters, decide on arrests." },
    { term: "Tax evasion", plain: "Illegally avoiding paying taxes. Used here to scare you." },
  ],
  contacts: [],
  questionsToAsk: [
    "(To the official tax agency, using its official number) Do I owe any taxes for 2024?",
    "(To your bank) Can you watch my account for unusual activity?",
  ],
  followUps: [
    "How can I tell if a tax letter is real?",
    "What if I already paid with gift cards?",
    "Where can I report this?",
  ],
  labels: { ...LABELS_EN },
};

export const SAMPLES: readonly Sample[] = [
  {
    id: "hospital-bill",
    name: "Hospital bill",
    blurb: "Insurance paid part. What's left, and can I get help?",
    image: "/samples/hospital-bill.png",
    analysis: hospitalBill,
  },
  {
    id: "school-meals",
    name: "School meals form",
    blurb: "A form with income questions and a deadline",
    image: "/samples/school-meals.png",
    analysis: schoolMeals,
  },
  {
    id: "tax-scam",
    name: "Urgent tax letter",
    blurb: "Pay in 24 hours or be arrested?",
    image: "/samples/tax-scam.png",
    analysis: taxScam,
  },
];
