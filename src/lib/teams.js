export const NFL_TEAMS = {
  'ARI': { name: 'Arizona Cardinals', color: '#97233F' },
  'ATL': { name: 'Atlanta Falcons', color: '#A71930' },
  'BAL': { name: 'Baltimore Ravens', color: '#241773' },
  'BUF': { name: 'Buffalo Bills', color: '#00338D' },
  'CAR': { name: 'Carolina Panthers', color: '#0085CA' },
  'CHI': { name: 'Chicago Bears', color: '#0B162A' },
  'CIN': { name: 'Cincinnati Bengals', color: '#FB4F14' },
  'CLE': { name: 'Cleveland Browns', color: '#311D00' },
  'DAL': { name: 'Dallas Cowboys', color: '#003594' },
  'DEN': { name: 'Denver Broncos', color: '#FB4F14' },
  'DET': { name: 'Detroit Lions', color: '#0076B6' },
  'GB': { name: 'Green Bay Packers', color: '#203731' },
  'HOU': { name: 'Houston Texans', color: '#03202F' },
  'IND': { name: 'Indianapolis Colts', color: '#002C5F' },
  'JAX': { name: 'Jacksonville Jaguars', color: '#006778' },
  'KC': { name: 'Kansas City Chiefs', color: '#E31837' },
  'LV': { name: 'Las Vegas Raiders', color: '#000000' },
  'LAC': { name: 'Los Angeles Chargers', color: '#0080C6' },
  'LAR': { name: 'Los Angeles Rams', color: '#003594' },
  'MIA': { name: 'Miami Dolphins', color: '#008E97' },
  'MIN': { name: 'Minnesota Vikings', color: '#4F2683' },
  'NE': { name: 'New England Patriots', color: '#002244' },
  'NO': { name: 'New Orleans Saints', color: '#D3BC8D' },
  'NYG': { name: 'New York Giants', color: '#0B2265' },
  'NYJ': { name: 'New York Jets', color: '#125740' },
  'PHI': { name: 'Philadelphia Eagles', color: '#004C54' },
  'PIT': { name: 'Pittsburgh Steelers', color: '#FFB612' },
  'SF': { name: 'San Francisco 49ers', color: '#AA0000' },
  'SEA': { name: 'Seattle Seahawks', color: '#002244' },
  'TB': { name: 'Tampa Bay Buccaneers', color: '#D50A0A' },
  'TEN': { name: 'Tennessee Titans', color: '#0C2340' },
  'WAS': { name: 'Washington Commanders', color: '#5A1414' }
};

export function getTeamInfo(abbreviation) {
  return NFL_TEAMS[abbreviation] || { name: abbreviation, color: '#666666' };
}