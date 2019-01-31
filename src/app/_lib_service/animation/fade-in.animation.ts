import { trigger, state, animate, transition, style } from '@angular/animations';

export const fadeInAnimation =
    trigger('fadeInAnimation', [
        // route 'enter' transition
        state('default', style({
            opacity: 0,
            width: '0px',
            height: '0px'
        })),
        state('loading', style({
            opacity: 1,
            width: '100%',
            height: '100%'
        })),
        state('loadend', style({
            opacity: 0,
            width: '0px',
            height: '0px'
        })),
        transition('default => default', animate('0s')),
        transition('loading => loading', animate('2s ease-in')),
        transition('loadend => loadend', animate('2s ease-out'))
    ]);
