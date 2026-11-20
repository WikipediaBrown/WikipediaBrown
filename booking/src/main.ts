import { mount } from 'svelte';
import '../../website/src/lib/theme.css';
import './booking.css';
import Booking from './Booking.svelte';
mount(Booking, { target: document.getElementById('app')! });
