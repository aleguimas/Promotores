import "../tailwind-test.css"

export default function TestPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Página de Teste de CSS</h1>

      <div className="bg-blue-500 text-white p-4 rounded-lg">
        Este é um div com classes Tailwind diretamente aplicadas
      </div>

      <div className="test-bg-red test-p-4 test-rounded text-white">
        Este é um div com classes de teste do arquivo tailwind-test.css
      </div>

      <div className="gm-gradient-bg p-4 rounded-lg text-white">
        Este é um div com a classe personalizada gm-gradient-bg
      </div>

      <h2 className="gm-gradient-text text-xl font-bold">
        Este é um título com a classe personalizada gm-gradient-text
      </h2>
    </div>
  )
}
