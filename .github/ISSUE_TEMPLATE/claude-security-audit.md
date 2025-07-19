---
name: Claude Security Audit
about: Perform comprehensive security audits with Claude
title: '[Security] Security Audit - [Month Year]'
labels: security, claude-assist, high-priority
assignees: ''

---

## Security Audit Request

### Audit Scope
<!-- Check all that apply -->
- [ ] API key exposure check
- [ ] Environment variable security
- [ ] Input validation vulnerabilities
- [ ] XSS and injection risks
- [ ] Rate limiting bypasses
- [ ] Client-side security
- [ ] Dependency vulnerabilities
- [ ] Error message information leakage

### Claude Task
@claude please perform a comprehensive security audit of our codebase:

1. **API Key Security**
   - Check for any exposed API keys (CEREBRAS_API_KEY, OXYLABS credentials)
   - Verify all secrets are properly server-side only
   - Check webpack configuration for env var exposure

2. **Input Validation**
   - Review YouTube URL validation in `lib/youtube.ts`
   - Check for SQL/NoSQL injection risks
   - Verify proper sanitization of user inputs

3. **Client-Side Security**
   - Check for XSS vulnerabilities in transcript display
   - Review client-side error handling
   - Verify no sensitive data in browser storage

4. **Rate Limiting**
   - Test rate limiting implementation (1 req/10 sec)
   - Check for bypass possibilities
   - Review Redis security configuration

5. **Error Handling**
   - Ensure error messages don't expose internal services
   - Check for stack trace leakage
   - Verify proper error boundaries

6. **Dependencies**
   - Run `npm audit` and review results
   - Check for known vulnerabilities
   - Suggest secure alternatives if needed

### Expected Output
- [ ] List of vulnerabilities found (if any)
- [ ] Severity assessment for each issue
- [ ] Recommended fixes with code examples
- [ ] Best practices recommendations

### Additional Notes
<!-- Any specific security concerns or recent incidents -->