export default function TestCssPage() {
    return (
      <div className="space-y-8 p-4">
        <h1 className="text-3xl font-bold">Teste de CSS</h1>
  
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-500 text-white p-4 rounded-lg">Este div deve ter fundo azul</div>
  
          <div className="bg-red-500 text-white p-4 rounded-lg">Este div deve ter fundo vermelho</div>
  
          <div className="bg-green-500 text-white p-4 rounded-lg">Este div deve ter fundo verde</div>
  
          <div className="bg-yellow-500 text-black p-4 rounded-lg">Este div deve ter fundo amarelo</div>
        </div>
  
        <div className="gm-gradient-bg text-white p-4 rounded-lg">Este div deve ter um gradiente personalizado</div>
  
        <h2 className="gm-gradient-text text-2xl font-bold">Este texto deve ter um gradiente personalizado</h2>
  
        <div className="border border-blue-500 p-4 rounded-lg">Este div deve ter uma borda azul</div>
      </div>
    )
  }
  