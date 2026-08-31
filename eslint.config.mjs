import {defineConfig, globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// `next/core-web-vitals` et `next/typescript` étaient chargés via FlatCompat.
// eslint-config-next 16 publie ces ensembles en configs plates natives, ce qui
// supprime la dépendance à @eslint/eslintrc et prépare ESLint 10.
//
// ESLint reste en 9 : eslint-config-next 16 dépend de eslint-plugin-react ^7.37,
// dont la dernière version (7.37.5) plafonne son peer à `eslint ^9.7` et appelle
// context.getFilename(), supprimée par ESLint 10. Le blocage est en amont ;
// aucune version corrigée n'est publiée. Voir CLAUDE.md.
export default defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        rules: {
            // Reprise explicite de l'ancienne config : eslint-config-next 16 laisse
            // cette règle désactivée, la migration la perdrait sans ça.
            'react/no-unknown-property': 'error',

            // eslint-config-next 16 embarque eslint-plugin-react-hooks 7, qui ajoute les
            // règles du React Compiler. `set-state-in-effect` signale les cinq « fetch au
            // montage » de l'app — y compris les setState postérieurs à un await, qu'aucune
            // réécriture locale ne satisfait. Le correctif de fond est une bibliothèque de
            // données ou des Server Components : une refonte, hors périmètre de la montée de
            // version. Rétrogradé en avertissement pour garder le signal visible.
            // Suivi : section 10 (hors périmètre) de docs/superpowers/specs/2026-08-31-scheduler-refactor-design.md
            'react-hooks/set-state-in-effect': 'warn',
        },
    },
    globalIgnores([
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
    ]),
]);
