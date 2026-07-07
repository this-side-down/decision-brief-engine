# Construction workforce planning messy transcript

okay so jumping in, the thing we need to decide is whether we actually do anything with specialty trades before Q4 or whether we keep all the focus on the GC workforce planning stuff we already committed to.

i know sales is pushing on this because there are like two or maybe three conversations where specialty contractors are basically asking for the same kind of visibility but not exactly the same. mechanical contractor, electrical contractor, maybe one concrete but i’m not sure that one is far enough along. the mechanical VP ops said something about losing margin when they assign senior foremen too late, which is probably the clearest pain point we’ve heard so far.

customer success is a little worried because the GC customers are finally starting to get value from the project staffing views and we don’t want to muddy that. they’re seeing value when they can see gaps like 6 or 12 months out. but CS also said the admin story is already fragile in some accounts and they don’t want to support a weird half-built trade contractor workflow if sales starts promising it.

sales is saying this could be a bigger market, or at least a broader story. like not just workforce planning for GCs, but people planning for construction more generally. i get that, but product/design concern is that trade workflows might not just be “same thing with different labels.” they may need crews, certs, union stuff, geography, maybe short notice callouts, maybe foremen and superintendents and PMs and self-perform crews all in the same planning view. right now our model is pretty person / role / project oriented and not really crew oriented.

engineering said adding a couple fields is easy, changing planning logic around crews is not. they could probably support one sprint of discovery or prototype work before Q4 planning but not a whole new surface. design can do interviews and workflow mapping but not a full new product design track. so capacity is a real constraint.

there are basically four options on the table.

first option is pilot specialty trade forecasting with three design partners in August. sales likes this because it gives them something real to point to this quarter. product likes that it creates learning. CS is worried about expectations.

second option is just stay focused on GCs until the current roadmap is stronger. safest from execution standpoint. but then we might miss a market learning window and sales will say we’re not supporting expansion.

third option is build only a lightweight discovery prototype, not production, and use it to test workflow fit. maybe this is the sanest version. like show a mocked workflow to a VP ops and staffing coordinator, learn where GC model breaks, then decide.

fourth option is add trade-specific fields to current product and see if the existing workflow stretches. that might be tempting but could be the worst option if it creates junk data model decisions.

stakeholders are product/design, sales, CS, engineering, exec team, and then design partners. specifically maybe VP Ops at the mechanical contractor, workforce planning lead at electrical contractor, maybe someone from a self-perform team. customer success team is also a stakeholder because they’ll get stuck supporting it.

goals are: validate whether specialty trades are actually a near-term expansion path, don’t overfit to one trade, don’t derail GC roadmap, figure out if crew-level planning belongs in core product, give sales a credible story but don’t let them sell vaporware, and keep the pilot small enough that engineering can actually support it.

risks: specialty trade workflows could be too different. crew planning could blow up the data model. pilot customers could think this is committed roadmap. sales could oversell it. engineering could get dragged into custom fields. GC roadmap slips. and if we only talk to one mechanical contractor we may learn something that doesn’t generalize.

open questions: do trades actually need crew-level planning on day one or would role/person forecasting be useful enough? which segment should we start with, mechanical/electrical/concrete/self-perform? can sales talk about this as research without making it sound like a committed feature? what is the minimum useful workflow for a VP Ops? are certs/unions/regional rules core or edge cases? would the same forecast views work for GCs and trades? who owns success criteria for the pilot, product or sales or CS?

evidence we have is not huge but it’s not nothing. two expansion conversations mentioned trade contractor workforce visibility. mechanical contractor said late foreman assignment hurts margin. electrical contractor said they already do spreadsheet staffing reviews every Friday. GC customers mostly plan around salaried project teams, trades maybe more crews and field leadership. sales says broader market story. engineering says fields are easy but crew planning logic is hard.

i think the tension is mostly speed vs validation. sales wants motion now. product wants to avoid building the wrong thing. specialty trades are strategically attractive but could pull us away from GC workflow. a small pilot gets learning but could create custom work expectations. waiting preserves focus but could miss the window. adding fields is easy but not the same as validating a repeatable workflow.

my leaning, and i think maybe the group mostly agreed but not fully, is do a narrow discovery pilot with three specialty trade design partners, across at least two trade types. don’t commit to production delivery. test whether role/person-level forecasting is useful before investing in crew-level planning. sales can say we’re researching or running a design partner pilot, not that this is a committed feature.

next steps would be: identify three design partners, define success criteria before build work, run workflow interviews with VP Ops and staffing coordinators, map where current GC model fits or breaks, create a prototype or mocked workflow before touching production data model, and then decide by end of pilot whether specialty trades are an extension of current platform or separate product path.

i think we need exec alignment on the sales language too because if this gets positioned wrong we’ll end up with expectations we can’t meet.
