import { useOutletContext } from 'react-router-dom';
import type { Trip } from '../../store/tripStore';

export const useTripContext = () => useOutletContext<{ trip: Trip }>();
