 
export async function fetchSeasonEvents(year) {
  try {
    const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${year}/types/2/events?limit=1000`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }
    
    const data = await response.json();
    const events = [];
    
    // Fetch details for each event (limit to first 50 to avoid timeouts)
    const items = (data.items || []).slice(0, 50);
    
    for (const item of items) {
      try {
        const eventResponse = await fetch(item.$ref);
        if (eventResponse.ok) {
          const eventData = await eventResponse.json();
          
          // Only include regular season games (weeks 1-18)
          if (eventData.week && eventData.week.number >= 1 && eventData.week.number <= 18) {
            const competition = eventData.competitions?.[0];
            if (competition && competition.competitors?.length === 2) {
              const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
              const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
              
              events.push({
                espn_event_id: eventData.id,
                nfl_week: eventData.week.number,
                start_time_utc: new Date(eventData.date).toISOString(),
                home_team: homeTeam?.team?.abbreviation || 'TBD',
                away_team: awayTeam?.team?.abbreviation || 'TBD',
                status: competition.status?.type?.name || 'scheduled'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
      }
    }
    
    return events;
  } catch (error) {
    console.error('Error fetching season events:', error);
    throw error;
  }
}

export async function fetchWeekScoreboard(week) {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`ESPN scoreboard API error: ${response.status}`);
    }
    
    const data = await response.json();
    const games = [];
    
    for (const event of data.events || []) {
      const competition = event.competitions?.[0];
      if (competition && competition.competitors?.length === 2) {
        const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
        const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
        
        games.push({
          espn_event_id: event.id,
          status: competition.status?.type?.name || 'scheduled',
          home_team: homeTeam?.team?.abbreviation,
          away_team: awayTeam?.team?.abbreviation,
          home_score: parseInt(homeTeam?.score || 0),
          away_score: parseInt(awayTeam?.score || 0),
          winner_team: competition.status?.type?.completed ? 
            (homeTeam?.score > awayTeam?.score ? homeTeam?.team?.abbreviation : 
             awayTeam?.score > homeTeam?.score ? awayTeam?.team?.abbreviation : null) : null
        });
      }
    }
    
    return games;
  } catch (error) {
    console.error('Error fetching week scoreboard:', error);
    throw error;
  }
}