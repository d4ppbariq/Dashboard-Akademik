import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";

test("password form renders accessible current/new/confirm fields and honest session guidance", () => {
  // Render under the client React condition, not the suite's react-server condition.
  const html = execFileSync(process.execPath, ["--import", "tsx", "-e", `
    const React = require('react');
    global.React = React;
    const { renderToStaticMarkup } = require('react-dom/server');
    const { ChangePasswordForm } = require('./src/components/auth/change-password-form.tsx');
    console.log(renderToStaticMarkup(React.createElement(ChangePasswordForm, { action: async () => ({success:true}) })));
  `], { encoding: "utf8" });
  for (const field of ["current_password", "password", "password_confirm"]) {
    assert.match(html, new RegExp(`name="${field}"`));
    assert.match(html, new RegExp(`for="${field}"`));
  }
  assert.equal((html.match(/type="password"/g) ?? []).length, 3);
  assert.match(html, /autoComplete="current-password"/);
  assert.match(html, /autoComplete="new-password"/);
  assert.match(html, /minLength="8"/);
  assert.match(html, /maxLength="72"/);
  assert.match(html, /Simpan password baru/);
  assert.match(html, /tidak otomatis mengakhiri sesi/);
});
