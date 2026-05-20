import { TabMenu } from 'primereact/tabmenu';
import { useEffect, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router';
import BMTMDemo from './components/BMTMDemo';
import UARTDemo from './components/UARTDemo';

const options = [
  { label: 'UART Audio Transmitter', value: '/uart', element: <UARTDemo /> },
  { label: 'Binary Multi-Tone Modulator', value: '/bmtm', element: <BMTMDemo /> },
];

function App() {

  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    navigate(options[activeIndex].value);
  }, [activeIndex, navigate]);

  return (
    <div className="w-full h-dvh flex flex-col items-center">
      <TabMenu pt={{ label: { className: 'text-center' } }}
        model={options} activeIndex={activeIndex}
        onTabChange={(e) => {
          setActiveIndex(e.index);
          navigate(options[e.index].value);
        }} />

      <div className="my-auto">
        <Routes>
          <Route path="/" element={options[activeIndex].element} />
          {options.map(({ value, element }) => <Route path={value} element={element} />)}
        </Routes>
      </div>
    </div>
  );
}

export default App;
