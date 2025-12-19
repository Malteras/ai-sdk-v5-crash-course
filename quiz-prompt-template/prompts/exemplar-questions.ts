/**
 * Gold standard exemplar questions demonstrating the desired format and quality.
 * These examples cover different categories and showcase proper question structure.
 */

export const EXEMPLAR_QUESTIONS = [
    {
        category: 'Culture - Fine art',
        question:
            "From the Greek meaning 'arrangement of skin', what name is given to the art of preserving an animal's body in a lifelike state by stuffing it?",
        answer: 'Taxidermy',
    },
    {
        category: 'History - History',
        question:
            "The 'Hallstein Doctrine' (1955-1969) was a foreign policy principle of West Germany, declaring it an 'unfriendly act' if third countries established diplomatic relations with which other country?",
        answer: 'East Germany',
    },
    {
        category: 'Sport & Games - Sports',
        question:
            'Which carbohydrate precedes the names of the boxers Ray Leonard and Ray Robinson and the UFC fighter Rashad Evans?',
        answer: 'Sugar',
    },
    {
        category: 'Entertainment - Television',
        question:
            'Which French TV series starring Omar Sy, inspired by the stories of writer Maurice Leblanc, shares its name from a character in the Harry Potter universe?',
        answer: 'Lupin',
    },
    {
        category: 'Culture - Mythology',
        question:
            'Which beautiful youth in Greek mythology fell in love with his own reflection, giving his name to a psychological term for excessive self-love?',
        answer: 'Narcissus',
    },
    {
        category: 'Media - Literature',
        question:
            'Which word appears in the titles of books by Thomas Mann, Agatha Christie, Leo Tolstoy, and Arthur Miller?',
        answer: 'Death',
    },
    {
        category: 'History - Current Affairs',
        question:
            'Which former Prime Minister of New Zealand published her memoir \'A Different Kind of Power\' in 2025?',
        answer: 'Jacinda Ardern',
    },
    {
        category: 'Sciences - Fauna',
        question:
            "The 'Chupacabra' was first reportedly sighted in 1995. According to its Spanish name, which animals does this 'vampiric' creature particularly target?",
        answer: 'Goats',
    },
    {
        category: 'History - Exploration',
        question:
            'Butch Cassidy and the Sundance Kid in 1908 and Che Guevara in 1967 were all shot dead in which South American country?',
        answer: 'Bolivia',
    },
    {
        category: 'Culture - Architecture',
        question:
            'Which Italian architect, who shares his surname with a musical instrument, worked with Richard Rodgers on the Pompidou Centre in Paris?',
        answer: 'Renzo Piano',
    },
];

/**
 * Formats exemplar questions for use in prompts.
 */
export function formatExemplarQuestions(): string {
    return EXEMPLAR_QUESTIONS.map(
        (q, i) => `${i + 1}. [${q.category}] "${q.question}"`
    ).join('\n');
}
