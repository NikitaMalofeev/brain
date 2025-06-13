/**
 * Склоняет существительное в зависимости от числа.
 * @param number - число
 * @param one - форма для 1 (задание)
 * @param two - форма для 2, 3, 4 (задания)
 * @param five - форма для 5 и более (заданий)
 * @returns - правильная форма слова
 */
export function getNounPluralForm(number: number, one: string, two: string, five: string): string {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) {
        return five;
    }
    n %= 10;
    if (n === 1) {
        return one;
    }
    if (n >= 2 && n <= 4) {
        return two;
    }
    return five;
} 