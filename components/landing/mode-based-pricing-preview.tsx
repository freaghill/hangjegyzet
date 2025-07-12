export function ModeBasedPricingPreview() {
  return (
    <div className="py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">
          Válasszon feldolgozási módot az igényei szerint
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-2">Gyors</h3>
            <p className="text-gray-600">5 perc alatt kész</p>
            <p className="text-sm text-gray-500 mt-2">Gyors meeting összefoglalók</p>
          </div>
          <div className="border rounded-lg p-6 border-blue-500">
            <h3 className="font-semibold text-lg mb-2">Kiegyensúlyozott</h3>
            <p className="text-gray-600">10 perc alatt kész</p>
            <p className="text-sm text-gray-500 mt-2">Részletes jegyzőkönyvek</p>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-2">Precíz</h3>
            <p className="text-gray-600">20 perc alatt kész</p>
            <p className="text-sm text-gray-500 mt-2">Maximális pontosság</p>
          </div>
        </div>
      </div>
    </div>
  )
}