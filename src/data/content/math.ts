import type { ContentItem } from '../../types/content';
import {
    mathWorksheetCreatorClassicEntry,
    mathWorksheetCreatorStudioEntry,
    polygonGameEntry,
    polygonToolEntry,
} from './sharedEntries';
import { migrateLegacyWorksheetPath } from '../../utils/worksheetRoutes';

const normalizeMathEntry = (entry: ContentItem): ContentItem => {
    if (entry.type !== 'worksheet' || !entry.customHtmlPath) {
        return entry;
    }

    return {
        ...entry,
        customHtmlPath: migrateLegacyWorksheetPath(entry.customHtmlPath),
    };
};

const mathEntries: ContentItem[] = [
    // Example game entry removed - file '/example-game/index.html' does not exist
    // {
    //     id: 'legacy-html-example',
    //     title: 'Example Legacy Game',
    //     description: 'An example showing how to integrate an existing HTML/JS game.',
    //     type: 'game',
    //     category: 'math',
    //     subjects: ['Arithmetic'],
    //     gradeLevels: ['All'],
    //     customHtmlPath: '/example-game/index.html',
    //     dateAdded: '2024-01-01'
    // },
    mathWorksheetCreatorClassicEntry,
    {
        id: 'MathPuzzle',
        title: 'Math Puzzle',
        description: 'A fun and challenging math puzzle game for all ages.',
        type: 'game',
        category: 'math',
        subjects: ['Addition', 'Subtraction', 'Multiplication', 'Division'],
        gradeLevels: ['All'],
        customHtmlPath: '/Games/MathPuzzle/index.html',
        thumbnail: '/assets/thumbnails/optimized/math-puzzle-128.webp',
        dateAdded: '2026-01-26'
    },
    {
        id: 'preschool-fun-game',
        title: 'Preschool Fun!',
        description: 'A bright preschool puzzle game with ABCs, 123 counting, silly pattern play, animations, and funny sounds.',
        type: 'game',
        category: 'puzzles',
        subjects: ['Alphabet', 'Counting', 'Patterns'],
        gradeLevels: ['Preschool', 'Pre-K', 'Kindergarten'],
        customHtmlPath: '/Games/PreschoolFun/index.html',
        thumbnail: '/Games/PreschoolFun/thumb.svg',
        isFeatured: true,
        dateAdded: '2026-03-10'
    },
    {
        id: 'word-puzzle-game',
        title: 'Word Puzzle',
        description: 'Unscramble themed words using clues and category hints.',
        type: 'game',
        category: 'language',
        subjects: ['Vocabulary', 'Spelling', 'Word Recognition'],
        gradeLevels: ['All'],
        customHtmlPath: '/Games/Word Puzzle/index.html',
        thumbnail: '/assets/thumbnails/optimized/word-puzzle-128.webp',
        dateAdded: '2026-03-05'
    },
    mathWorksheetCreatorStudioEntry,
    {
        "id": "math-1minuteadditiontest-1768357163983",
        "title": "1minuteAdditionTEST",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/1minuteadditiontest/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-1minutedivisiontest-1768357163984",
        "title": "1minuteDivisionTEST",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/1minutedivisiontest/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-1minutemultiplicationtest-1768357163985",
        "title": "1minuteMultiplicationTEST",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/1minutemultiplicationtest/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-1minutesubtractiontest-1768357163986",
        "title": "1minuteSubtractionTEST",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/1minutesubtractiontest/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-2stepmathproblems-1768357163987",
        "title": "2stepMathProblems",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/2stepmathproblems/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-2stepmathproblems-easy-1768357163988",
        "title": "2stepMathProblems_Easy",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/2stepmathproblems-easy/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-2stepmathproblems-hard-1768357163989",
        "title": "2stepMathProblems_Hard",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/2stepmathproblems-hard/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-addition-worksheet-1768357163990",
        "title": "30_Addition_Worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-addition-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-addition-worksheet-5s-1768357163991",
        "title": "30_Addition_Worksheet_5s",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-addition-worksheet-5s/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-addition-worksheet-10s-1768357163992",
        "title": "30_Addition_Worksheet_10s",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-addition-worksheet-10s/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-addsub-worksheet-1768357163993",
        "title": "30_addsub_Worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-addsub-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-division-worksheet-1768357163994",
        "title": "30_Division_Worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-division-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-double-digit-addition-worksheet-1768357163994",
        "title": "30_Double_Digit_Addition_Worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-double-digit-addition-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-double-digit-addsub-worksheet-1768357163995",
        "title": "30_Double_Digit_addsub_Worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-double-digit-addsub-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-double-digit-division-worksheet-1768357163996",
        "title": "30_Double_Digit_Division_Worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-double-digit-division-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-double-digit-multiplication-worksheet-1768357163997",
        "title": "30_Double_Digit_Multiplication_Worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-double-digit-multiplication-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-double-digit-subtraction-worksheet-1768357163998",
        "title": "30_Double_Digit_Subtraction_Worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-double-digit-subtraction-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-multiplication-worksheet-1768357163999",
        "title": "30_Multiplication_Worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-multiplication-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-multiplicationdivision-worksheet-1768357164000",
        "title": "30_multiplicationdivision_worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-multiplicationdivision-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-simple-substitution-worksheet-1768357164001",
        "title": "30_Simple_Substitution_Worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-simple-substitution-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-subtraction-worksheet-1768357164002",
        "title": "30_Subtraction_Worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-subtraction-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-subtraction-worksheet-5s-1768357164003",
        "title": "30_Subtraction_Worksheet_5s",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-subtraction-worksheet-5s/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-30-subtraction-worksheet-10s-1768357164004",
        "title": "30_Subtraction_Worksheet_10s",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/30-subtraction-worksheet-10s/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-additionsubtractionmissing-substitution-1768357164005",
        "title": "AdditionSubtractionMissing_substitution",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/additionsubtractionmissing-substitution/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-countby2s-1768357164006",
        "title": "Countby2s",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/countby2s/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-countby5s-1768357164007",
        "title": "Countby5s",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/countby5s/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-countby10s-1768357164008",
        "title": "Countby10s",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/countby10s/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-countingoddnumbers-1768357164009",
        "title": "countingoddnumbers",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/countingoddnumbers/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-crosswordpuzzlegenerator-1768357164009",
        "title": "crosswordpuzzlegenerator",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/crosswordpuzzlegenerator/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-decimal-numbers-worksheet-1768357164010",
        "title": "decimal_numbers_worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/decimal-numbers-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-emptymultiplicationtable-1768357164011",
        "title": "emptyMultiplicationtable",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/emptymultiplicationtable/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-extraeasyadditionmissingaddend-1768357164012",
        "title": "extraeasyadditionmissingaddend",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/extraeasyadditionmissingaddend/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-extraeasysubtractionmissingminuend-1768357164013",
        "title": "extraeasysubtractionmissingminuend",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/extraeasysubtractionmissingminuend/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-fillintheblankartcalender-1768357164014",
        "title": "fillintheblankARTCALENDER",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/fillintheblankartcalender/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-fillintheblankcalender-1768357164015",
        "title": "fillintheblankCALENDER",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/fillintheblankcalender/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-introduction-to-fractions-worksheet-1768357164016",
        "title": "introduction_to_fractions_worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/introduction-to-fractions-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-introtofractions-1768357164016",
        "title": "introtoFractions",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/introtofractions/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-missingpattern8shape-1768357164017",
        "title": "missingpattern8SHAPE",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/missingpattern8shape/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-missingpatterncountsheet-1768357164018",
        "title": "missingpatterncountsheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/missingpatterncountsheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-missingpatterncountsheet-easy-1768357164019",
        "title": "missingpatterncountsheet_easy",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/missingpatterncountsheet-easy/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-missingpatterncountsheet-hard-1768357164020",
        "title": "missingpatterncountsheet_hard",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/missingpatterncountsheet-hard/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-missingpatternshape-1768357164020",
        "title": "missingpatternSHAPE",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/missingpatternshape/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-positive-negative-add-sub-worksheet-1768357164021",
        "title": "positive_negative_add_sub_worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/positive-negative-add-sub-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-positivenegativesecretword-1768357164021",
        "title": "PositiveNegativeSecretWord",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/positivenegativesecretword/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-presidents-worksheet-1768357164022",
        "title": "presidents_worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/presidents-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-presidenttestfirst10-1768357164023",
        "title": "presidenttestfirst10",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/presidenttestfirst10/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-presidenttestlast15-1768357164024",
        "title": "presidenttestlast15",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/presidenttestlast15/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-simple-substitution10-worksheet-1768357164024",
        "title": "Simple_Substitution10_Worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/simple-substitution10-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-simple-substitution16-additionworksheet-1768357164025",
        "title": "Simple_Substitution16_additionWorksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/simple-substitution16-additionworksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-simple-substitution16-divisionworksheet-1768357164026",
        "title": "Simple_Substitution16_divisionWorksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/simple-substitution16-divisionworksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-simple-substitution16-mixaddsubworksheet-1768357164026",
        "title": "Simple_Substitution16_mixAddSubWorksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/simple-substitution16-mixaddsubworksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-simple-substitution16-multiplicationworksheet-1768357164027",
        "title": "Simple_Substitution16_multiplicationWorksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/simple-substitution16-multiplicationworksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-simple-substitution16-subtractionworksheet-1768357164028",
        "title": "Simple_Substitution16_subtractionWorksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/simple-substitution16-subtractionworksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-simple-substitution16-variablesworksheet-1768357164029",
        "title": "Simple_Substitution16_variablesWorksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/simple-substitution16-variablesworksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-simple-substitutionwordproblems-1768357164030",
        "title": "simple_substitutionWORDproblems",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/simple-substitutionwordproblems/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-storytelling-elements-worksheet-1768357164029",
        "title": "storytelling_elements_worksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/storytelling-elements-worksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-substitutionsecretword-1768357164031",
        "title": "SubstitutionSecretWord",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/substitutionsecretword/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-uniquepatternworksheet-1768357164032",
        "title": "uniquepatternworksheet",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/uniquepatternworksheet/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-uniquepatternworksheeteasy-1768357164035",
        "title": "uniquepatternworksheetEASY",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/uniquepatternworksheeteasy/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-uniquepatternworksheethard-1768357164036",
        "title": "uniquepatternworksheetHARD",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/uniquepatternworksheethard/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-uniquepatternworksheetmedium-1768357164037",
        "title": "uniquepatternworksheetMEDIUM",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/uniquepatternworksheetmedium/index.html",
        "dateAdded": "2026-01-14"
    },
    {
        "id": "math-us-states-word-bank-1768357164038",
        "title": "us_states_word_bank",
        "description": "Start auto-uploaded worksheet.",
        "type": "worksheet",
        "category": "math",
        "subjects": [
            "General"
        ],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Worksheets/us-states-word-bank/index.html",
        "dateAdded": "2026-01-14"
    },
    polygonToolEntry,
    polygonGameEntry,
    {
        "id": "math-quiz-it-polygon",
        "title": "Quiz it Polygon!",
        "description": "Build, classify, and measure polygons in a polished 10-question geometry challenge.",
        "type": "game",
        "category": "math",
        "subjects": ["Geometry"],
        "gradeLevels": [
            "All"
        ],
        "customHtmlPath": "/Games/Quiz it Polygon!/index.html",
        "thumbnail": "/Games/Quiz it Polygon!/thumb.png",
        "dateAdded": "2026-03-16"
    },
    {
        "id": "math-spy-academy",
        "title": "The Spy Academy",
        "description": "An immersive escape room experience with team-based puzzles, color code mysteries, and timed challenges. Work together to solve the mystery!",
        "type": "game",
        "category": "puzzles",
        "subjects": ["Logic", "Problem Solving", "Teamwork"],
        "gradeLevels": ["All"],
        "customHtmlPath": "/Games/SpyAcademy/index.html",
        "thumbnail": "/assets/thumbnails/optimized/spy-academy-128.webp",
        "dateAdded": "2026-01-24"
    },
    {
        "id": "math-2-players-math-write",
        "title": "2 Players Math Write",
        "description": "Take turns practicing handwriting and math skills with a friend.",
        "type": "game",
        "category": "math",
        "subjects": ["Addition", "Subtraction", "Multiplication", "Division"],
        "gradeLevels": ["All"],
        "customHtmlPath": "/Games/2PlayersMathWrite/index.html",
        "thumbnail": "/assets/thumbnails/optimized/two-players-math-write-128.webp",
        "dateAdded": "2026-01-28"
    },
    {
        "id": "math-car-king",
        "title": "Car King",
        "description": "A car-themed math game where you identify and learn about cars.",
        "type": "game",
        "category": "math",
        "subjects": ["General"],
        "gradeLevels": ["All"],
        "customHtmlPath": "/Games/CarKingFinal/index.html",
        "thumbnail": "/assets/thumbnails/optimized/car-king-128.webp",
        "dateAdded": "2026-01-31"
    },
    {
        "id": "math-analog-clock-game-v2",
        "title": "Analog Clock Game",
        "description": "Practice reading analog clocks with interactive time challenges.",
        "type": "game",
        "category": "math",
        "subjects": ["Time", "Clock Reading"],
        "gradeLevels": ["All"],
        "customHtmlPath": "/Games/analogclockgame/index.html",
        "thumbnail": "/Games/analogclockgame/thumb.png",
        "dateAdded": "2026-03-05"
    },
    {
        "id": "math-farmers-market-frenzy",
        "title": "Farmers Market Frenzy 3D",
        "description": "Run a farmers market stand, calculate totals, and return correct change.",
        "type": "game",
        "category": "math",
        "subjects": ["Addition", "Subtraction", "Money"],
        "gradeLevels": ["All"],
        "customHtmlPath": "/Games/Farmersmarket/index.html",
        "thumbnail": "/Games/Farmersmarket/thumb.png",
        "dateAdded": "2026-02-19"
    },
    {
        "id": "states-champion",
        "title": "States Champion",
        "description": "Study U.S. state shapes and build map recognition through quick challenge rounds.",
        "type": "game",
        "category": "geography",
        "subjects": ["Geography", "U.S. States"],
        "gradeLevels": ["All"],
        "customHtmlPath": "/Games/States Champion/index.html",
        "thumbnail": "/Games/States Champion/assets/images/ui/main-menu-hero.svg",
        "dateAdded": "2026-03-18"
    },
    {
        "id": "cage-pet-rescue",
        "title": "Cage Pet Rescue",
        "description": "Rescue trapped pets by solving math problems and managing your energy carefully.",
        "type": "game",
        "category": "math",
        "subjects": ["Addition", "Subtraction", "Multiplication", "Problem Solving"],
        "gradeLevels": ["All"],
        "customHtmlPath": "/Games/cagepetrescue/index.html",
        "thumbnail": "/Games/cagepetrescue/assets/images/math_rescue_animated.webp",
        "dateAdded": "2026-03-18"
    }
];

export const mathContent: ContentItem[] = mathEntries.map(normalizeMathEntry);
