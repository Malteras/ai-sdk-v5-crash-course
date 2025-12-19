import { QUIZ_CATEGORIES } from '../schemas/quiz-categories.js';

export interface CategoryValidationResult {
    valid: boolean;
    errors: string[];
    majorCategory?: string;
    subcategory?: string;
}

/**
 * Validates a category tag against the QUIZ_CATEGORIES taxonomy.
 *
 * @param categoryTag - The category tag to validate (format: [Major Category - Subcategory])
 * @returns Validation result with errors if any
 */
export function validateCategory(categoryTag: string): CategoryValidationResult {
    const errors: string[] = [];

    // Check if tag is empty
    if (!categoryTag || categoryTag.trim() === '') {
        errors.push('Category tag is empty');
        return { valid: false, errors };
    }

    // Parse the category tag - expecting format: [Major Category - Subcategory]
    const match = categoryTag.match(/^\[(.+?)\s*-\s*(.+?)\]$/);

    if (!match) {
        errors.push(`Invalid format: Expected [Major Category - Subcategory], got "${categoryTag}"`);
        return { valid: false, errors };
    }

    const majorCategory = match[1]?.trim();
    const subcategory = match[2]?.trim();

    if (!majorCategory || !subcategory) {
        errors.push('Major category or subcategory is missing');
        return { valid: false, errors };
    }

    // Check if major category exists in taxonomy
    const validCategories = Object.keys(QUIZ_CATEGORIES);
    if (!validCategories.includes(majorCategory)) {
        errors.push(
            `Invalid major category: "${majorCategory}". Valid options: ${validCategories.join(', ')}`
        );
    }

    // Check if subcategory exists under the major category
    const validSubcategories = QUIZ_CATEGORIES[majorCategory as keyof typeof QUIZ_CATEGORIES];
    if (validSubcategories && !validSubcategories.includes(subcategory)) {
        errors.push(
            `Invalid subcategory: "${subcategory}" not found under "${majorCategory}". Valid options: ${validSubcategories.join(', ')}`
        );
    }

    return {
        valid: errors.length === 0,
        errors,
        majorCategory,
        subcategory,
    };
}

/**
 * Validates multiple questions' category tags.
 *
 * @param questions - Array of questions with category tags
 * @returns Summary of validation results
 */
export function validateCategories(
    questions: Array<{ question: string; categoryTag: string }>
): {
    results: Array<{ question: string; validation: CategoryValidationResult }>;
    totalCount: number;
    validCount: number;
    invalidCount: number;
    passRate: number;
} {
    const results = questions.map((q) => ({
        question: q.question,
        validation: validateCategory(q.categoryTag),
    }));

    const validCount = results.filter((r) => r.validation.valid).length;
    const invalidCount = results.filter((r) => !r.validation.valid).length;

    return {
        results,
        totalCount: questions.length,
        validCount,
        invalidCount,
        passRate: validCount / questions.length,
    };
}
