import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// NOTE: the markup uses the ".reveal" class (About / Research / Story
// copy blocks), not ".line-reveal" — that class never existed in any
// component, so this previously animated nothing at all.
export function initAnimations(){
  gsap.utils.toArray('.reveal').forEach(el=>{
    gsap.from(el,{y:60,opacity:0,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 82%',once:true}});
  });
  ScrollTrigger.refresh();
}
