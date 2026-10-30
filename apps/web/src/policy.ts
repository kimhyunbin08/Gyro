import './styles.css';
import './builder.css';

const saved = localStorage.getItem('gyro.appearance-theme');
document.documentElement.dataset.theme = saved === 'paper' || saved === 'clay' || saved === 'midnight'
  ? saved
  : 'midnight';
