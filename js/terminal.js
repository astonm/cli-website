function runRootTerminal(term) {
  if (term._initialized) {
    return;
  }

  term.init();
  term._initialized = true;
  term.prompt();

  window.addEventListener('resize', function () {
    term._initialized = false;
    term.init(term.user, true);
    for (c of term.history) {
      term.prompt("\r\n", ` ${c}\r\n`);
      term.command(c);
    }
    term.prompt();
    term.scrollToBottom();
    term._initialized = true;
  });

  term.onData(e => {
    if (term._initialized) {
      switch (e) {
        case '\r': // Enter
          term.writeln("");
          var status;

          if (term.currentLine.length > 0) {
            term.history.push(term.currentLine);
            term.currentLine = term.currentLine.trim();
            status = term.command(term.currentLine);

            const tokens = term.currentLine.split(" ");
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
              "event": "command",
              "command": tokens.shift(),
              "args": tokens.join(" "),
            });
          }

          if (status != 1) {
            console.log(status);
            term.prompt();
            term.clearCurrentLine(true);
          }
          break;
        case '\u0001': // Ctrl+A
          term.write('\x1b[D'.repeat(term.pos()));
          break;
        case '\u0005': // Ctrl+E
          if (term.pos() < term.currentLine.length) {
            term.write('\x1b[C'.repeat(term.currentLine.length - term.pos()));
          }
          break;
        case '\u0003': // Ctrl+C
          term.prompt();
          term.clearCurrentLine(true);
          break;
        case '\u0008': // Ctrl+H
        case '\u007F': // Backspace (DEL)
          // Do not delete the prompt
          if (term.pos() > 0) {
            const newLine = term.currentLine.slice(0, term.pos() - 1) + term.currentLine.slice(term.pos());
            term.setCurrentLine(newLine, true)
          }
          break;
        case '\033[A': // up
          var h = [... term.history].reverse();
          if (term.historyCursor < h.length - 1) {
            term.historyCursor += 1;
            term.setCurrentLine(h[term.historyCursor], false);
          }
          break;
        case '\033[B': // down
          var h = [... term.history].reverse();
          if (term.historyCursor > 0) {
            term.historyCursor -= 1;
            term.setCurrentLine(h[term.historyCursor], false);
          } else {
            term.clearCurrentLine(true);
          }
          break;
        case '\033[C': // right
          if (term.pos() < term.currentLine.length) {
            term.write('\x1b[C');
          }
          break;
        case '\033[D': // left
          if (term.pos() > 0) {
            term.write('\x1b[D');
          }
          break;
        case '\t': // tab
          const cmd = term.currentLine.split(" ")[0];
          const rest = term.currentLine.slice(cmd.length).trim();
          const autocompleteCmds = Object.keys(commands).filter((c) => c.startsWith(cmd));
          var autocompleteArgs;

          // detect what to autocomplete
          if (autocompleteCmds && autocompleteCmds.length > 1) {
            const oldLine = term.currentLine;
            term.stylePrint(`\r\n${autocompleteCmds.sort().join("   ")}`);
            term.prompt();
            term.setCurrentLine(oldLine);
          } else if (["cat", "tail", "less", "head", "open", "mv", "cp", "chown", "chmod"].includes(cmd)) {
            autocompleteArgs = _filesHere().filter((f) => f.startsWith(rest));
          } else if (["whois", "finger", "groups"].includes(cmd)) {
            autocompleteArgs = Object.keys(team).filter((f) => f.startsWith(rest));
          } else if (["man", "woman", "tldr"].includes(cmd)) {
            autocompleteArgs = Object.keys(portfolio).filter((f) => f.startsWith(rest));
          } else if (["cd"].includes(cmd)) {
            autocompleteArgs = _filesHere().filter((d) => d.startsWith(rest) && !Object.keys(FILES).includes(d));
          }

          // do the autocompleting
          if (autocompleteArgs && autocompleteArgs.length > 1) {
            const oldLine = term.currentLine;
            term.writeln(`\r\n${autocompleteArgs.join("   ")}`);
            term.prompt();
            term.setCurrentLine(oldLine);
          } else if (commands[cmd] && autocompleteArgs && autocompleteArgs.length > 0) {
            term.setCurrentLine(`${cmd} ${autocompleteArgs[0]}`);
          } else if (autocompleteCmds && autocompleteCmds.length == 1) {
            term.setCurrentLine(`${autocompleteCmds[0]} `);
          }
          break;
        default: // Print all other characters
          const newLine = `${term.currentLine.slice(0, term.pos())}${e}${term.currentLine.slice(term.pos())}`;
          term.setCurrentLine(newLine, true);
          break;
      }
      term.scrollToBottom();
    }
  });
}

function colorText(text, color) {
  const colors = {
    "command": "\x1b[1;35m",
    "hyperlink": "\x1b[1;34m",
    "user": "\x1b[1;33m",
    "prompt": "\x1b[1;32m",
  }
  return `${colors[color] || ""}${text}\x1b[0;38m`;
}
