export function Instructions({isFullscreen, isOpen, onClose}) {
  if (isFullscreen) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true" />}

      {/* Instructions Panel */}
      {isOpen && (
        <div className="fixed right-0 top-0 h-full w-[500px] bg-[#161b22] border-l border-gray-600 z-50 shadow-2xl overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Inspiration Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-semibold text-white">✨ Inspiration</h3>
              </div>
              <div className="text-[#c9d1d9] space-y-3 text-sm leading-relaxed">
                <p>
                  Pianists and coders have something in common: when they press the keys, things come to life. One
                  creates sound, the other creates visuals.
                  <span className="text-[#58a6ff] font-medium">
                    What if both happened together? Let's see—and listen.
                  </span>
                </p>
              </div>
            </section>

            {/* Getting Started Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-semibold text-white">🚀 Getting Started</h3>
              </div>
              <div className="text-[#c9d1d9] space-y-3 text-sm">
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Start coding in the editor on the left</li>
                  <li>Watch the piano notes fall as you type</li>
                  <li>
                    <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">Cmd/Ctrl + S</code> to save your
                    code and run the sketch
                  </li>
                  <li>Create visual sketches that respond to the melody</li>
                  <li>Select different pieces from the dropdown to change the music</li>
                </ol>
              </div>
            </section>

            {/* Tips Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-semibold text-white">🎹 Features</h3>
              </div>
              <div className="text-[#c9d1d9] space-y-2 text-sm">
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Pino notes automatically play and fall down as you type</li>
                  <li>You can create multiple canvases in one sketch</li>
                  <li>
                    <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">Cmd/Ctrl + Drag</code> to
                    reorder canvases
                  </li>
                  <li>
                    <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">Cmd/Ctrl</code> to show the
                    outline of the canvas
                  </li>
                  <li>
                    Use <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">melody.A</code> to access
                    the current note's amplitude
                  </li>
                  <li>Drag sliders on numbers to adjust values interactively</li>
                  <li>Click color values to open the color picker</li>
                  <li>
                    <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">Cmd/Ctrl + O/o</code> to display
                    your face as the background
                  </li>
                </ul>
              </div>
            </section>

            {/* Keyboard Shortcuts Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-semibold text-white">⌨️ Shortcuts</h3>
              </div>
              <div className="text-[#c9d1d9] space-y-4 text-sm">
                <div>
                  <h4 className="text-white font-medium mb-2">File Management</h4>
                  <ul className="space-y-1 ml-2">
                    <li>
                      <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">Cmd/Ctrl + B</code> - Create
                      new file
                    </li>
                    <li>
                      <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">Cmd/Ctrl + ←</code> - Previous
                      file
                    </li>
                    <li>
                      <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">Cmd/Ctrl + →</code> - Next
                      file
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Editor</h4>
                  <ul className="space-y-1 ml-2">
                    <li>
                      <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">Cmd/Ctrl + S</code> - Save
                    </li>
                    <li>
                      <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">Cmd/Ctrl + M</code> - Move
                      note circles down
                    </li>
                    <li>
                      <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">jj</code> - Escape (Vim mode)
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Pieces & Templates</h4>
                  <ul className="space-y-1 ml-2">
                    <li>
                      <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">Cmd/Ctrl + I</code> - Switch
                      piece
                    </li>
                    <li>
                      <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">
                        Cmd/Ctrl + Shift + 1-2, 9-0
                      </code>{" "}
                      - Code templates
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Visual Modes</h4>
                  <ul className="space-y-1 ml-2">
                    <li>
                      <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">Cmd/Ctrl + O</code> - Toggle
                      ASCII mode
                    </li>
                    <li>
                      <code className="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff]">Cmd/Ctrl + Shift + O</code> -
                      Toggle normal mode
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
