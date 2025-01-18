'use client';
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function SortableCryptoItem({ crypto, onCryptoClick, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: crypto.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onRemove(crypto.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-shadow cursor-move relative"
      onClick={() => onCryptoClick(crypto)}
    >
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 p-2 z-10"
      >
        ✕
      </button>
      
      <div 
        className="flex justify-between items-center mb-2"
        {...attributes}
        {...listeners}
      >
        <div>
          <h2 className="text-xl font-semibold">{crypto.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{crypto.symbol}</p>
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold">
          €{crypto.price?.toFixed(2)}
        </p>
        <p className={`${crypto.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          24u: {crypto.change?.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [pinnedCryptos, setPinnedCryptos] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(false);

  const commonSymbols = {
    // Top 20
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'usdt': 'tether',
    'bnb': 'binancecoin',
    'sol': 'solana',
    'xrp': 'ripple',
    'usdc': 'usd-coin',
    'ada': 'cardano',
    'doge': 'dogecoin',
    'avax': 'avalanche-2',
    'trx': 'tron',
    'dot': 'polkadot',
    'matic': 'polygon',
    'link': 'chainlink',
    'shib': 'shiba-inu',
    'dai': 'dai',
    'ltc': 'litecoin',
    'uni': 'uniswap',
    'atom': 'cosmos',
    'etc': 'ethereum-classic',
    
    // 21-50
    'okb': 'okb',
    'xmr': 'monero',
    'fil': 'filecoin',
    'near': 'near',
    'apt': 'aptos',
    'xlm': 'stellar',
    'ldo': 'lido-dao',
    'icp': 'internet-computer',
    'bcn': 'bitcoin-cash',
    'inj': 'injective-protocol',
    'arb': 'arbitrum',
    'hbar': 'hedera-hashgraph',
    'vet': 'vechain',
    'op': 'optimism',
    'sui': 'sui',
    'mana': 'decentraland',
    'sand': 'the-sandbox',
    'grt': 'the-graph',
    'algo': 'algorand',
    'theta': 'theta-network',
    'aave': 'aave',
    'axs': 'axie-infinity',
    'eos': 'eos',
    'ftm': 'fantom',
    'flow': 'flow',
    'neo': 'neo',
    'gala': 'gala',
    'cake': 'pancakeswap-token',
    'kcs': 'kucoin-shares',
    'snx': 'synthetix-network-token',
    
    // Alternatieve schrijfwijzen
    'bitcoin': 'bitcoin',
    'ethereum': 'ethereum',
    'cardano': 'cardano',
    'polkadot': 'polkadot',
    'chainlink': 'chainlink',
    'polygon': 'polygon',
    'solana': 'solana',
    'avalanche': 'avalanche-2',
    'uniswap': 'uniswap',
    'ripple': 'ripple'
  };

  // Laad gepinde crypto's bij het opstarten
  useEffect(() => {
    const saved = localStorage.getItem('pinnedCryptos');
    if (saved) {
      setPinnedCryptos(JSON.parse(saved));
    }
    // Update prijzen elke minuut
    const interval = setInterval(updatePrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Update prijzen voor alle gepinde crypto's
  const updatePrices = async () => {
    if (pinnedCryptos.length === 0) return;
    
    const ids = pinnedCryptos.map(crypto => crypto.id).join(',');
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`
      );
      const data = await response.json();
      
      setPinnedCryptos(prev => prev.map(crypto => ({
        ...crypto,
        price: data[crypto.id].eur,
        change: data[crypto.id].eur_24h_change
      })));
    } catch (error) {
      console.error('Fout bij het updaten van prijzen:', error);
    }
  };

  const searchCrypto = async () => {
    if (!searchTerm.trim() || isLoading) return;

    setIsLoading(true);
    
    try {
      // Eerst zoeken naar de crypto
      const searchResponse = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${searchTerm}`
      );

      if (!searchResponse.ok) {
        throw new Error(`HTTP error! status: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      if (searchData.coins && searchData.coins.length > 0) {
        const coinId = searchData.coins[0].id;

        // Controleer of de crypto al bestaat
        if (pinnedCryptos.some(crypto => crypto.id === coinId)) {
          alert('Deze cryptocurrency is al toegevoegd!');
          setSearchTerm('');
          return;
        }
        
        // Dan de prijs ophalen
        const priceResponse = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur&include_24hr_change=true`
        );

        if (!priceResponse.ok) {
          throw new Error(`HTTP error! status: ${priceResponse.status}`);
        }

        const priceData = await priceResponse.json();
        
        if (Object.keys(priceData).length > 0) {
          const newCrypto = {
            id: coinId,
            name: searchData.coins[0].name,
            symbol: searchData.coins[0].symbol.toUpperCase(),
            price: priceData[coinId].eur,
            change: priceData[coinId].eur_24h_change
          };
          
          setPinnedCryptos(prev => {
            const updated = [...prev, newCrypto];
            localStorage.setItem('pinnedCryptos', JSON.stringify(updated));
            return updated;
          });
          
          setSearchTerm('');
        }
      } else {
        alert('Cryptocurrency niet gevonden. Probeer een andere zoekterm.');
      }
    } catch (error) {
      console.error('Zoekfout:', error);
      alert('Er is een fout opgetreden bij het zoeken. Probeer het later opnieuw.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeCrypto = (cryptoId) => {
    setPinnedCryptos(prev => {
      const updated = prev.filter(crypto => crypto.id !== cryptoId);
      localStorage.setItem('pinnedCryptos', JSON.stringify(updated));
      return updated;
    });
  };

  const fetchChartData = async (coinId, cryptoName) => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=eur&days=7&interval=daily`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.prices || data.prices.length === 0) {
        throw new Error('Geen prijsdata beschikbaar');
      }

      const prices = data.prices.map(price => ({
        x: new Date(price[0]).toLocaleDateString('nl-NL', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        }),
        y: price[1]
      }));

      setChartData({
        labels: prices.map(price => price.x),
        datasets: [
          {
            label: `${cryptoName} Prijs (EUR)`,
            data: prices.map(price => price.y),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            tension: 0.1,
            fill: true
          }
        ]
      });
    } catch (error) {
      console.error('Fout bij ophalen grafiekdata:', error);
      alert('Er was een probleem bij het laden van de grafiek. Probeer het later opnieuw.');
      setChartData(null);
    }
  };

  const handleCryptoClick = async (crypto) => {
    setSelectedCrypto(crypto);
    await fetchChartData(crypto.id, crypto.name);
  };

  const handleTimeRangeChange = async (range) => {
    setTimeRange(range);
    if (selectedCrypto) {
      const daysMap = {
        '24h': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };
      await fetchChartData(selectedCrypto.id, selectedCrypto.name);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setPinnedCryptos((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newArray = [...items];
        const [movedItem] = newArray.splice(oldIndex, 1);
        newArray.splice(newIndex, 0, movedItem);
        
        localStorage.setItem('pinnedCryptos', JSON.stringify(newArray));
        return newArray;
      });
    }
  };

  return (
    <div className="min-h-screen p-8 pb-20 gap-8 font-sans relative">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Crypto Tracker</h1>
        
        {/* Zoekbalk met laad-indicator */}
        <div className="flex gap-4 mb-8">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Zoek een cryptocurrency... (bijv. bitcoin)"
            className="flex-1 p-2 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isLoading) {
                searchCrypto();
              }
            }}
            disabled={isLoading}
          />
          <button
            onClick={searchCrypto}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Laden...
              </span>
            ) : (
              'Zoeken'
            )}
          </button>
        </div>

        {/* Drag & Drop Grid */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pinnedCryptos.map(crypto => crypto.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pinnedCryptos.map((crypto) => (
                <SortableCryptoItem
                  key={crypto.id}
                  crypto={crypto}
                  onCryptoClick={handleCryptoClick}
                  onRemove={removeCrypto}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Grafiek Modal */}
        {selectedCrypto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{selectedCrypto.name}</h2>
                <button 
                  onClick={() => setSelectedCrypto(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Periode indicator */}
              <div className="mb-4">
                <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm">
                  7 dagen
                </span>
              </div>

              {/* Grafiek */}
              <div className="h-[400px] relative">
                {chartData ? (
                  <Line
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          display: true,
                          title: {
                            display: true,
                            text: 'Tijd'
                          }
                        },
                        y: {
                          display: true,
                          title: {
                            display: true,
                            text: 'Prijs (EUR)'
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-gray-500">Laden van grafiek...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-gray-400 text-sm">
        Made by AI
      </footer>
    </div>
  );
}
