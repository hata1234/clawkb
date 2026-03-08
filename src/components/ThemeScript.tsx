// Prevents flash of wrong theme on initial page load.
// This is a static server component that injects a blocking script
// to read localStorage and set data-theme before React hydrates.
// The script content is a hardcoded string literal — no user input is involved,
// so there is no XSS risk. This is a standard pattern used by next-themes and similar libraries.

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: [
          "(function(){",
          "try{",
          "var t=localStorage.getItem('clawkb-theme');",
          "if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}",
          "else{document.documentElement.setAttribute('data-theme','dark')}",
          "}catch(e){document.documentElement.setAttribute('data-theme','dark')}",
          "})()",
        ].join(""),
      }}
    />
  );
}
