export type FaqItem = {
  question: string;
  answer: string;
};

export const globalFaq: FaqItem[] = [
  {
    question: 'How do I choose the right role?',
    answer:
      'Tap the card that matches your responsibility (Student, Guardian, Lecturer, etc.). Each role has a tailored dashboard and login screen.',
  },
  {
    question: 'I forgot my password, what do I do?',
    answer:
      "Select your role, go to the login screen, and use the 'Forgot password' option. The system will guide you through generating or applying a reset token.",
  },
  {
    question: 'Where can I find my course or resource list?',
    answer:
      'After signing in as a student or lecturer, navigate to the dashboard tiles such as Timetable, Assignments, or Library to access your resources.',
  },
  {
    question: 'How can guardians monitor progress and fees?',
    answer:
      'Choose the Guardian role, sign in, and open the Progress or Fees tiles. Each tile provides summaries and actions tailored to family support.',
  },
  {
    question: 'Who should I contact for technical issues?',
    answer:
      "Use the Ask assistant bubble to reach the EduAssist helper for quick guidance. For unresolved issues, contact your institution's administrator.",
  },
];
