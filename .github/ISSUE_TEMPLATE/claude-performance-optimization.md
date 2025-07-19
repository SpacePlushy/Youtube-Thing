---
name: Claude Performance Optimization
about: Use Claude to identify and fix performance issues
title: '[Performance] '
labels: performance, claude-assist
assignees: ''

---

## Performance Optimization Request

### Performance Issue
<!-- Describe the performance problem -->

### Current Metrics
<!-- If available, provide current performance metrics -->
- Page load time: 
- API response time:
- Bundle size:
- Memory usage:

### Claude Task
@claude please analyze and optimize performance:

1. **Performance Analysis**
   - Profile current implementation
   - Identify bottlenecks
   - Measure baseline metrics

2. **Optimization Areas**
   - [ ] Bundle size reduction
   - [ ] API response time improvement
   - [ ] Rendering performance
   - [ ] Memory usage optimization
   - [ ] Caching strategies
   - [ ] Database query optimization

3. **Specific Focus Areas**
   - Transcript processing for long videos (3+ hours)
   - Streaming response optimization
   - Client-side caching improvements
   - API route performance
   - React component rendering

4. **Implementation Plan**
   - Prioritize high-impact optimizations
   - Ensure no functionality regression
   - Add performance monitoring

### Target Metrics
<!-- What performance goals are we aiming for? -->
- 

### Constraints
<!-- Any limitations to consider -->
- Must maintain current functionality
- Cannot increase infrastructure costs
- Must work within Vercel limits

### Additional Context
<!-- Why these optimizations are needed -->