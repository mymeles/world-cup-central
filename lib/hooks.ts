import { useQuery } from '@tanstack/react-query';
import { dataProvider } from './dataProvider';

export const useMatches = () =>
  useQuery({
    queryKey: ['matches'],
    queryFn: () => dataProvider.getMatches(),
    // Poll the server gateway so configured live providers can update scores.
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

export const useMatch = (id: string) =>
  useQuery({
    queryKey: ['match', id],
    queryFn: () => dataProvider.getMatch(id),
    enabled: !!id,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

export const useMatchDetail = (id: string) =>
  useQuery({
    queryKey: ['match-detail', id],
    queryFn: () => dataProvider.getMatchDetail(id),
    enabled: !!id,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

export const useStandings = (group: string) =>
  useQuery({
    queryKey: ['standings', group],
    queryFn: () => dataProvider.getStandings(group),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

export const useGroups = () =>
  useQuery({ queryKey: ['groups'], queryFn: () => dataProvider.getGroups() });

export const useTeams = () =>
  useQuery({ queryKey: ['teams'], queryFn: () => dataProvider.getTeams() });

export const useTopScorers = () =>
  useQuery({
    queryKey: ['scorers'],
    queryFn: () => dataProvider.getTopScorers(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

export const useMatchesForTeam = (teamId: string) =>
  useQuery({ queryKey: ['team-matches', teamId], queryFn: () => dataProvider.getMatchesForTeam(teamId), enabled: !!teamId });
