import js from "@eslint/js";
import globals from "globals";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginImport from "eslint-plugin-import";
import tsEslintPlugin from "@typescript-eslint/eslint-plugin";
import eslintPluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import typescriptEslintParser from "@typescript-eslint/parser";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "src-tauri/**",
      ".stylelintrc.js",
      "eslint.config.js",
      "vite.config.ts",
      "src/vite-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  reactYouMightNotNeedAnEffect.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: typescriptEslintParser,
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ...eslintPluginReactConfig,
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    plugins: {
      "react-hooks": eslintPluginReactHooks,
      "react-refresh": reactRefresh,
      import: eslintPluginImport,
      "@typescript-eslint": tsEslintPlugin,
    },
    rules: {
      /** Viteプロジェクト作成時に初期状態で存在したルール */
      ...eslintPluginReactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      /** 不要なスペースは禁止 */
      "no-trailing-spaces": "error",
      "no-multi-spaces": "error",
      /** 連続した2行以上の空行は禁止 */
      "no-multiple-empty-lines": ["error", { max: 1 }],
      /** 厳密等価演算子を強制する */
      eqeqeq: ["error", "always"],
      /** コメントの後に半角スペースを強制する */
      "spaced-comment": ["error", "always", { exceptions: ["-", "+"] }],
      /** if文の括弧の省略禁止 */
      curly: "error",
      /** 暗黙の型変換を防ぐ */
      "no-implicit-coercion": [
        "error",
        { boolean: false, number: true, string: true },
      ],
      /** 相対パスインポート禁止 */
      "no-restricted-imports": [
        "error",
        {
          patterns: ["./", "../"],
        },
      ],
      /** 非nullアサーション演算子(!)の使用を禁止する */
      "@typescript-eslint/no-non-null-assertion": "error",
      /** typeのみをimportする時はtypeと記載することを強制する */
      "@typescript-eslint/consistent-type-imports": "error",
      /** 配列の型定義をする際にArray<T>を強制する (T[]は禁止) */
      "@typescript-eslint/array-type": [
        "error",
        { default: "generic", readonly: "generic" },
      ],
      /** 条件式での暗黙の型変換を防ぐ */
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
        },
      ],
      /** React 17以降の新しいJSX変換ではReactをインポートする必要がないためオフにする */
      "react/react-in-jsx-scope": "off",
      /** React 17以降の新しいJSX変換ではJSXで使用されるReact変数のスコープチェックを無効化する */
      "react/jsx-uses-react": "off",
      /** 属性やPropsにstringを渡す時はダブルクオーテーション必須 */
      "jsx-quotes": ["error", "prefer-double"],
      /** childrenが無い時はコンポーネントをSelf-Closingするようにする */
      "react/self-closing-comp": "error",
      /** stringのPropsを渡す時に{}を使用するのを禁止する  */
      "react/jsx-curly-brace-presence": ["error", { props: "never" }],
      /** JSXでboolean型のpropsにtrueを渡す際に省略形を強制する */
      "react/jsx-boolean-value": ["error", "never"],
      /** React Hooksのルールを適用 */
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      /** Propsをアルファベット順にソートする */
      "react/jsx-sort-props": [
        "error",
        {
          callbacksLast: false,
          shorthandFirst: false,
          shorthandLast: false,
          ignoreCase: true,
          noSortAlphabetically: false,
          reservedFirst: true,
        },
      ],
      /** importの順番を種類ごとに統一する */
      "import/order": [
        "error",
        {
          groups: [
            "builtin", // fs, pathなど
            "external", // npm installしたパッケージ
            "internal", // tsconfigでパスエイリアス設定したものなど
            ["parent", "sibling"], // 相対パス
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always", // グループごとに空行を入れる
          alphabetize: { order: "asc", caseInsensitive: true }, // アルファベット順
        },
      ],
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: ["./tsconfig.node.json", "./tsconfig.json"],
        },
      },
    },
  },
);
